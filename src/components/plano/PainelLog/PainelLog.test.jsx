import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import PainelLog from './PainelLog.jsx';
import { mensagens } from '../../../mensagens.js';
import { capturarTokenDaUrl, limparToken } from '../../../services/sessao.js';

const m = mensagens.log;

// Socket falso no lugar do global. O serviço continua sendo o único a instanciar WebSocket; aqui
// só trocamos o construtor que ele encontra, que é como o browser o entregaria.
let sockets = [];

class SocketFalso {
  constructor(url, protocolos) {
    this.url = url;
    this.protocolos = protocolos;
    this.close = vi.fn();
    sockets.push(this);
  }

  emitir(evento) {
    act(() => this.onmessage({ data: JSON.stringify(evento) }));
  }

  // Rajada num `act` só. Emitir uma a uma renderiza o React por linha, e com centenas de linhas
  // isso vira trabalho quadrático que estoura o tempo do teste sem provar nada a mais.
  emitirVarios(eventos) {
    act(() => {
      for (const evento of eventos) this.onmessage({ data: JSON.stringify(evento) });
    });
  }

  cair() {
    act(() => this.onclose());
  }
}

const linha = (texto, stream = 'stdout') => ({ tipo: 'linha', stream, linha: texto, ts: '2026-09-08T00:00:00.000Z' });

beforeEach(() => {
  sockets = [];
  globalThis.WebSocket = SocketFalso;
  capturarTokenDaUrl({ hash: '#token=tok', pathname: '/', search: '' }, { replaceState: () => {} });
});

afterEach(() => {
  limparToken();
  delete globalThis.WebSocket;
});

describe('PainelLog', () => {
  it('começa esperando a primeira linha', () => {
    render(<PainelLog runId="r1" />);
    expect(screen.getByText(m.esperando)).toBeInTheDocument();
  });

  it('mostra as linhas na ordem em que chegam', () => {
    render(<PainelLog runId="r1" />);
    sockets[0].emitir(linha('primeira'));
    sockets[0].emitir(linha('segunda'));

    const registro = screen.getByRole('log');
    expect(registro).toHaveTextContent('primeira');
    expect(registro).toHaveTextContent('segunda');
    expect(registro.textContent.indexOf('primeira')).toBeLessThan(registro.textContent.indexOf('segunda'));
  });

  it('distingue stderr de stdout com texto, não só com cor', () => {
    render(<PainelLog runId="r1" />);
    sockets[0].emitir(linha('deu ruim', 'stderr'));
    expect(screen.getByText(m.stream.stderr)).toBeInTheDocument();
    expect(screen.getByText('!')).toBeInTheDocument();
  });

  it('quem chega no meio recebe o histórico antes da linha nova', () => {
    render(<PainelLog runId="r1" />);
    sockets[0].emitir(linha('do histórico 1'));
    sockets[0].emitir(linha('do histórico 2'));
    sockets[0].emitir(linha('ao vivo'));

    const registro = screen.getByRole('log');
    expect(registro).toHaveTextContent('do histórico 1');
    expect(registro).toHaveTextContent('ao vivo');
  });

  it('o evento de fim mostra o estado final', () => {
    render(<PainelLog runId="r1" />);
    sockets[0].emitir(linha('trabalhando'));
    sockets[0].emitir({ tipo: 'fim', estado: 'sucesso', exitCode: 0, erro: null });

    expect(screen.getByRole('status')).toHaveTextContent(m.fim('sucesso', 0));
  });

  it('fim com falha mostra o exit code e o erro', () => {
    render(<PainelLog runId="r1" />);
    sockets[0].emitir({ tipo: 'fim', estado: 'falha', exitCode: 3, erro: 'quebrou' });

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('exit 3');
    expect(status).toHaveTextContent('quebrou');
  });

  it('conexão perdida sem fim oferece reconectar', () => {
    render(<PainelLog runId="r1" />);
    sockets[0].cair();

    expect(screen.getByRole('alert')).toHaveTextContent(m.conexaoPerdida);
    expect(screen.getByRole('button', { name: m.reconectar })).toBeInTheDocument();
  });

  it('conexão fechada depois do fim não vira alarme', () => {
    render(<PainelLog runId="r1" />);
    sockets[0].emitir({ tipo: 'fim', estado: 'sucesso', exitCode: 0, erro: null });
    sockets[0].cair();

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('reconectar abre socket novo e não duplica as linhas já recebidas', () => {
    render(<PainelLog runId="r1" />);
    sockets[0].emitir(linha('linha unica'));
    sockets[0].cair();

    fireEvent.click(screen.getByRole('button', { name: m.reconectar }));
    expect(sockets).toHaveLength(2);

    // O transmissor reenvia o histórico a quem assina. A tela limpou antes, então não duplica.
    sockets[1].emitir(linha('linha unica'));
    expect(screen.getAllByText(/linha unica/)).toHaveLength(1);
  });

  it('payload fora do contrato é descartado sem quebrar a tela', () => {
    render(<PainelLog runId="r1" />);
    act(() => sockets[0].onmessage({ data: 'isto não é json' }));
    act(() => sockets[0].onmessage({ data: JSON.stringify({ tipo: 'linha', stream: 'stdin' }) }));

    expect(screen.getByText(m.esperando)).toBeInTheDocument();
  });

  it('desmontar fecha o socket', () => {
    const { unmount } = render(<PainelLog runId="r1" />);
    const socket = sockets[0];
    unmount();
    expect(socket.close).toHaveBeenCalled();
  });

  it('trocar de run fecha o socket antigo e limpa a tela', () => {
    const { rerender } = render(<PainelLog runId="r1" />);
    sockets[0].emitir(linha('do run antigo'));

    rerender(<PainelLog runId="r2" />);
    expect(sockets[0].close).toHaveBeenCalled();
    expect(sockets).toHaveLength(2);
    expect(screen.queryByText(/do run antigo/)).not.toBeInTheDocument();
  });

  it('sem sessão não tenta conectar e explica o que fazer', () => {
    limparToken();
    render(<PainelLog runId="r1" />);
    expect(sockets).toHaveLength(0);
    expect(screen.getByText(m.semSessao)).toBeInTheDocument();
  });

  // jsdom não faz layout, então as medidas de rolagem são fixadas à mão. O que se prova aqui é a
  // regra: perto do fim o painel acompanha; longe do fim ele para de puxar a tela.
  function medir(elemento, { scrollTop, scrollHeight, clientHeight }) {
    Object.defineProperty(elemento, 'scrollHeight', { value: scrollHeight, configurable: true });
    Object.defineProperty(elemento, 'clientHeight', { value: clientHeight, configurable: true });
    elemento.scrollTop = scrollTop;
  }

  it('acompanha a última linha enquanto o usuário está no fim', () => {
    render(<PainelLog runId="r1" />);
    const caixa = screen.getByRole('log');
    medir(caixa, { scrollTop: 200, scrollHeight: 300, clientHeight: 100 });
    fireEvent.scroll(caixa);

    sockets[0].emitir(linha('nova'));
    expect(caixa.scrollTop).toBe(300);
  });

  it('para de puxar a tela quando o usuário rolou para cima', () => {
    render(<PainelLog runId="r1" />);
    const caixa = screen.getByRole('log');
    medir(caixa, { scrollTop: 0, scrollHeight: 300, clientHeight: 100 });
    fireEvent.scroll(caixa);

    sockets[0].emitir(linha('nova'));
    expect(caixa.scrollTop).toBe(0);
  });

  it('descarta as linhas mais antigas para a aba não travar', () => {
    render(<PainelLog runId="r1" />);
    sockets[0].emitirVarios(Array.from({ length: 520 }, (_, i) => linha(`linha ${i}`)));

    expect(screen.queryByText(/linha 0$/)).not.toBeInTheDocument();
    expect(screen.getByText(/linha 519/)).toBeInTheDocument();
  });
});
