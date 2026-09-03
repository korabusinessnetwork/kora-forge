import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import PainelLog, { TETO_DE_LINHAS, limparEscapes } from './PainelLog.jsx';
import { mensagens } from '../../../mensagens.js';

const m = mensagens.log;

const comando = (extra = {}) => ({ id: 'install', cmd: 'npm', args: ['install'], estado: 'rodando', runId: 'run-1', ...extra });
const linha = (texto, stream = 'stdout', ts = '2026-09-03T00:00:00.000Z') => ({ tipo: 'linha', stream, linha: texto, ts });

function renderizar(props = {}) {
  const onParar = vi.fn();
  const onReconectar = vi.fn();
  const utils = render(<PainelLog comando={comando()} estado="conectado" onParar={onParar} onReconectar={onReconectar} {...props} />);
  return { ...utils, onParar, onReconectar };
}

// Linha real de um `npm run dev` capturado do produto rodando: no terminal isso vira cor, na
// página viraria `[32m[1mVITE` no meio da frase.
describe('limparEscapes', () => {
  const ESC = String.fromCharCode(27);

  it('tira cor e movimento de cursor, mantendo o texto', () => {
    expect(limparEscapes(`${ESC}[32m${ESC}[1mVITE${ESC}[22m v8.2.2 pronto`)).toBe('VITE v8.2.2 pronto');
  });

  it('tira caractere de controle solto sem comer o resto', () => {
    expect(limparEscapes(`carregando${String.fromCharCode(13)}pronto`)).toBe('carregandopronto');
  });

  it('linha comum passa intacta, acento e seta inclusive', () => {
    expect(limparEscapes('  ➜  Local: http://localhost:5173/ (Área)')).toBe('  ➜  Local: http://localhost:5173/ (Área)');
  });
});

describe('PainelLog', () => {
  it('sem comando nenhum, o vazio traz a próxima ação em vez de tela em branco', () => {
    renderizar({ comando: null, estado: 'ocioso' });
    expect(screen.getByText(m.semComando)).toBeInTheDocument();
    expect(screen.getByText(m.semComandoTexto)).toBeInTheDocument();
  });

  it('conectando é dito em letras, nunca spinner mudo', () => {
    renderizar({ estado: 'conectando' });
    expect(screen.getByRole('status')).toHaveTextContent(m.conectando);
  });

  it('conectado e sem saída mostra o vazio, não um carregando infinito', () => {
    renderizar({ eventos: [] });
    expect(screen.getByText(m.vazio)).toBeInTheDocument();
    expect(screen.getByText(m.vazioTexto)).toBeInTheDocument();
  });

  it('erro mostra o motivo e oferece conectar de novo', () => {
    const { onReconectar } = renderizar({ estado: 'erro' });
    expect(screen.getByRole('alert')).toHaveTextContent(m.erro);
    fireEvent.click(screen.getByRole('button', { name: m.reconectar }));
    expect(onReconectar).toHaveBeenCalled();
  });

  it('mostra as linhas, o comando de origem e a contagem', () => {
    renderizar({ eventos: [linha('instalando'), linha('pronto')] });
    expect(screen.getByText('instalando')).toBeInTheDocument();
    expect(screen.getByText('pronto')).toBeInTheDocument();
    expect(screen.getByText(m.de('npm install'))).toBeInTheDocument();
    expect(screen.getByText(m.linhas(2))).toBeInTheDocument();
  });

  // A diferença entre stdout e stderr não pode ser só cor: fica no DOM e no texto.
  it('diferencia stdout de stderr no DOM e por rótulo textual', () => {
    renderizar({ eventos: [linha('normal'), linha('quebrou', 'stderr')] });
    const area = screen.getByRole('log');
    const linhas = within(area).getAllByText(/normal|quebrou/);
    expect(linhas[0].closest('[data-stream]')).toHaveAttribute('data-stream', 'stdout');
    expect(linhas[1].closest('[data-stream]')).toHaveAttribute('data-stream', 'stderr');
    expect(within(area).getByText(m.stream.stderr)).toBeInTheDocument();
  });

  // P-05: conteúdo do processo é dado, nunca instrução nem markup.
  it('linha do processo é renderizada como texto, nunca como HTML', () => {
    const veneno = '<img src=x onerror="alert(1)"> & <script>alert(2)</script>';
    const { container } = renderizar({ eventos: [linha(veneno)] });
    expect(screen.getByText(veneno)).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
  });

  it('a linha na tela vem sem sequência de escape de terminal', () => {
    const ESC = String.fromCharCode(27);
    renderizar({ eventos: [linha(`${ESC}[32mpronto em 309 ms${ESC}[0m`)] });
    expect(screen.getByText('pronto em 309 ms')).toBeInTheDocument();
  });

  it('linha vazia continua ocupando uma linha do log', () => {
    renderizar({ eventos: [linha(''), linha('depois')] });
    expect(screen.getByText(m.linhas(2))).toBeInTheDocument();
  });

  // O nome carrega o comando: a fila também tem um parar, e dois botões com o mesmo nome seriam
  // duas leituras idênticas no leitor de tela.
  it('comando rodando oferece parar, nomeado pelo comando; terminado não oferece', () => {
    const { onParar, unmount } = renderizar({ eventos: [linha('x')] });
    fireEvent.click(screen.getByRole('button', { name: m.parar('npm install') }));
    expect(onParar).toHaveBeenCalledWith('run-1');
    unmount();

    render(<PainelLog comando={comando({ estado: 'sucesso' })} estado="fechado" eventos={[linha('x')]} onParar={vi.fn()} />);
    expect(screen.queryByRole('button', { name: m.parar('npm install') })).toBeNull();
  });

  it('o evento de fim aparece no log com o estado traduzido', () => {
    renderizar({ eventos: [linha('x'), { tipo: 'fim', estado: 'sucesso', exitCode: 0, erro: null }] });
    expect(screen.getByText(m.fim(mensagens.materializacao.comandoEstado.sucesso))).toBeInTheDocument();
  });

  // Processo que escreve muito não pode travar a tela, e o corte nunca é silencioso.
  it('corta o que renderiza no teto, diz que cortou e mantém a contagem real', () => {
    const muitas = Array.from({ length: TETO_DE_LINHAS + 40 }, (_, i) => linha(`linha ${i}`));
    renderizar({ eventos: muitas });
    expect(screen.getByText(m.cortado(TETO_DE_LINHAS))).toBeInTheDocument();
    expect(screen.getByText(m.linhas(TETO_DE_LINHAS + 40))).toBeInTheDocument();
    expect(screen.queryByText('linha 0')).toBeNull();
    expect(screen.getByText(`linha ${TETO_DE_LINHAS + 39}`)).toBeInTheDocument();
  });

  it('descarte de evento fora do contrato é dito, nunca escondido', () => {
    renderizar({ eventos: [linha('x')], descartados: 2 });
    expect(screen.getByText(m.descartados(2))).toBeInTheDocument();
  });

  // Autoscroll com trava: rolar para cima para de puxar a tela e oferece voltar.
  it('rolar para cima trava o autoscroll e oferece voltar para o fim', () => {
    renderizar({ eventos: [linha('a'), linha('b')] });
    const area = screen.getByRole('log');
    expect(screen.queryByRole('button', { name: m.seguirOFim })).toBeNull();

    Object.defineProperty(area, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(area, 'clientHeight', { value: 200, configurable: true });
    area.scrollTop = 0;
    fireEvent.scroll(area);

    expect(screen.getByText(m.travado)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: m.seguirOFim }));
    expect(screen.queryByRole('button', { name: m.seguirOFim })).toBeNull();
    expect(area.scrollTop).toBe(1000);
  });
});
