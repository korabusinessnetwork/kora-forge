import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assinarLogDoRun, urlDoRun, MARCADOR_DE_TOKEN } from './logDeRun.js';
import { capturarTokenDaUrl, limparToken } from './sessao.js';

const TOKEN = 'abc123TOKEN';

function darToken() {
  capturarTokenDaUrl({ hash: `#token=${TOKEN}`, pathname: '/', search: '' }, { replaceState: () => {} });
}

// Socket de mentira: guarda o que foi pedido no handshake e deixa o teste empurrar mensagens.
function socketFalso() {
  const socket = { fechado: false, close: () => { socket.fechado = true; } };
  const criar = vi.fn((url, protocolos) => {
    socket.url = url;
    socket.protocolos = protocolos;
    return socket;
  });
  return { socket, criar };
}

function assinar(runId = 'run-1') {
  const { socket, criar } = socketFalso();
  const eventos = [];
  const estados = [];
  const cancelar = assinarLogDoRun(runId, {
    criarSocket: criar,
    onEventos: (lista, meta) => eventos.push({ lista, meta }),
    onEstado: (estado, erro) => estados.push({ estado, erro }),
  });
  const enviar = (dados) => socket.onmessage?.({ data: typeof dados === 'string' ? dados : JSON.stringify(dados) });
  return { socket, criar, eventos, estados, cancelar, enviar };
}

const linha = (texto, stream = 'stdout') => ({ tipo: 'linha', stream, linha: texto, ts: '2026-09-03T00:00:00.000Z' });

beforeEach(() => {
  limparToken();
});

describe('urlDoRun', () => {
  it('usa ws: em http e wss: em https, com o host da página', () => {
    expect(urlDoRun('r1', { protocol: 'http:', host: '127.0.0.1:5173' })).toBe('ws://127.0.0.1:5173/api/ws/runs/r1');
    expect(urlDoRun('r1', { protocol: 'https:', host: 'localhost:7337' })).toBe('wss://localhost:7337/api/ws/runs/r1');
  });

  it('codifica o runId, para id estranho não virar outro caminho', () => {
    expect(urlDoRun('a/b?c', { protocol: 'http:', host: 'h' })).toBe('ws://h/api/ws/runs/a%2Fb%3Fc');
  });
});

describe('assinarLogDoRun', () => {
  // O browser não permite header customizado no handshake, e query string entraria em log de
  // acesso. O token vai no subprotocolo, e a ordem importa: o servidor lê o valor seguinte
  // ao marcador (server/lib/guarda.js).
  it('manda o token no subprotocolo, nunca na URL', () => {
    darToken();
    const { socket } = assinar('run-7');

    expect(socket.protocolos).toEqual([MARCADOR_DE_TOKEN, TOKEN]);
    expect(socket.url).toContain('/api/ws/runs/run-7');
    expect(socket.url).not.toContain(TOKEN);
  });

  it('sem token, não abre conexão nenhuma e diz que não está autorizado', () => {
    const { socket, criar } = socketFalso();
    const estados = [];
    assinarLogDoRun('run-1', { criarSocket: criar, onEstado: (estado, erro) => estados.push({ estado, erro }) });

    expect(criar).not.toHaveBeenCalled();
    expect(socket.url).toBeUndefined();
    expect(estados.at(-1).estado).toBe('erro');
    expect(estados.at(-1).erro.codigo).toBe('FORGE_UNAUTHORIZED');
  });

  it('acumula as linhas válidas na ordem e anuncia conectado', () => {
    darToken();
    const { socket, eventos, estados, enviar } = assinar();

    socket.onopen();
    enviar(linha('linha 1'));
    enviar(linha('erro 1', 'stderr'));
    enviar({ tipo: 'fim', estado: 'sucesso', exitCode: 0, erro: null });

    expect(estados.map((e) => e.estado)).toEqual(['conectando', 'conectado']);
    expect(eventos.at(-1).lista).toEqual([
      linha('linha 1'),
      linha('erro 1', 'stderr'),
      { tipo: 'fim', estado: 'sucesso', exitCode: 0, erro: null },
    ]);
  });

  // O log é observação da execução. Um evento estranho não pode matar a tela que mostra o que
  // está rodando, e sumir com ele em silêncio também seria mentir.
  it('descarta e conta o que não é JSON ou está fora do contrato, sem parar o resto', () => {
    darToken();
    const { eventos, enviar } = assinar();

    enviar('isto não é json');
    enviar({ tipo: 'linha', stream: 'inventado', linha: 'x', ts: 'agora' });
    enviar({ tipo: 'outra-coisa' });
    enviar({ tipo: 'linha', stream: 'stdout', linha: 'ok', ts: 'agora', extra: 'campo a mais' });
    enviar(linha('sobrevivi'));

    expect(eventos.at(-1).meta.descartados).toBe(4);
    expect(eventos.at(-1).lista).toEqual([linha('sobrevivi')]);
  });

  it('linha vazia continua sendo uma linha e não some do log', () => {
    darToken();
    const { eventos, enviar } = assinar();
    enviar(linha(''));
    expect(eventos.at(-1).lista).toEqual([linha('')]);
  });

  it('erro de socket vira estado de erro para a tela, sem lançar', () => {
    darToken();
    const { socket, estados } = assinar();
    socket.onerror(new Event('error'));
    expect(estados.at(-1).estado).toBe('erro');
    expect(estados.at(-1).erro.codigo).toBe('FORGE_OFFLINE');
  });

  it('cancelar fecha o socket, cala os avisos e é seguro chamar duas vezes', () => {
    darToken();
    const { socket, eventos, estados, cancelar, enviar } = assinar();
    const antes = eventos.length;

    cancelar();
    expect(socket.fechado).toBe(true);

    enviar(linha('depois do cancelamento'));
    socket.onclose?.();
    expect(eventos.length).toBe(antes);
    expect(estados.at(-1).estado).toBe('conectando');

    expect(() => cancelar()).not.toThrow();
  });

  it('construtor que explode vira erro tratado, não exceção solta na tela', () => {
    darToken();
    const estados = [];
    const cancelar = assinarLogDoRun('run-1', {
      criarSocket: () => { throw new Error('sem WebSocket neste ambiente'); },
      onEstado: (estado, erro) => estados.push({ estado, erro }),
    });
    expect(estados.at(-1).estado).toBe('erro');
    expect(estados.at(-1).erro.codigo).toBe('FORGE_OFFLINE');
    expect(() => cancelar()).not.toThrow();
  });
});
