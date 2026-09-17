import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { urlDoRun, interpretarEvento, assinarLog } from './logAoVivo.js';
import { capturarTokenDaUrl, limparToken } from './sessao.js';

function darSessao(token = 'abc123') {
  capturarTokenDaUrl({ hash: `#token=${token}`, pathname: '/', search: '' }, { replaceState: () => {} });
}

function socketFalso() {
  const socket = { close: vi.fn(), onopen: null, onclose: null, onerror: null, onmessage: null };
  const criados = [];
  const criarSocket = vi.fn((url, protocolos) => {
    criados.push({ url, protocolos });
    return socket;
  });
  return { socket, criados, criarSocket };
}

beforeEach(() => limparToken());
afterEach(() => limparToken());

describe('urlDoRun', () => {
  it('troca http por ws e mantém o host', () => {
    expect(urlDoRun('r1', { protocol: 'http:', host: '127.0.0.1:7337' })).toBe('ws://127.0.0.1:7337/api/ws/runs/r1');
  });

  it('troca https por wss', () => {
    expect(urlDoRun('r1', { protocol: 'https:', host: 'local.test' })).toBe('wss://local.test/api/ws/runs/r1');
  });

  it('escapa o runId', () => {
    expect(urlDoRun('a/b c', { protocol: 'http:', host: 'h' })).toBe('ws://h/api/ws/runs/a%2Fb%20c');
  });
});

describe('interpretarEvento', () => {
  it('aceita linha e fim dentro do contrato', () => {
    expect(interpretarEvento(JSON.stringify({ tipo: 'linha', stream: 'stdout', linha: 'oi', ts: 'agora' })))
      .toEqual({ tipo: 'linha', stream: 'stdout', linha: 'oi', ts: 'agora' });
    expect(interpretarEvento(JSON.stringify({ tipo: 'fim', estado: 'sucesso', exitCode: 0, erro: null })))
      .toEqual({ tipo: 'fim', estado: 'sucesso', exitCode: 0, erro: null });
  });

  it.each([
    ['texto que não é JSON', 'isto não é json'],
    ['tipo desconhecido', JSON.stringify({ tipo: 'outro' })],
    ['stream fora do enum', JSON.stringify({ tipo: 'linha', stream: 'stdin', linha: 'x', ts: 't' })],
    ['campo faltando', JSON.stringify({ tipo: 'linha', stream: 'stdout' })],
    ['não é string', 42],
  ])('descarta %s sem quebrar', (_rotulo, entrada) => {
    expect(interpretarEvento(entrada)).toBeNull();
  });
});

describe('assinarLog', () => {
  it('manda o token no subprotocolo, nunca na URL', () => {
    darSessao('tok123');
    const { criados, criarSocket } = socketFalso();
    assinarLog('r1', { onEvento: () => {}, criarSocket, onEstado: () => {} });

    expect(criados[0].protocolos).toEqual(['forge-token', 'tok123']);
    expect(criados[0].url).not.toContain('tok123');
  });

  it('sem token não conecta e avisa a tela', () => {
    const { criarSocket } = socketFalso();
    const estados = [];
    const fechar = assinarLog('r1', { onEvento: () => {}, criarSocket, onEstado: (e) => estados.push(e) });

    expect(criarSocket).not.toHaveBeenCalled();
    expect(estados).toEqual(['sem-sessao']);
    expect(() => fechar()).not.toThrow();
  });

  it('entrega só evento válido, e o inválido não chega na tela', () => {
    darSessao();
    const { socket, criarSocket } = socketFalso();
    const recebidos = [];
    assinarLog('r1', { onEvento: (e) => recebidos.push(e), criarSocket });

    socket.onmessage({ data: JSON.stringify({ tipo: 'linha', stream: 'stdout', linha: 'a', ts: 't' }) });
    socket.onmessage({ data: 'lixo' });
    socket.onmessage({ data: JSON.stringify({ tipo: 'fim', estado: 'sucesso', exitCode: 0, erro: null }) });

    expect(recebidos.map((e) => e.tipo)).toEqual(['linha', 'fim']);
  });

  it('acompanha o estado da conexão', () => {
    darSessao();
    const { socket, criarSocket } = socketFalso();
    const estados = [];
    assinarLog('r1', { onEvento: () => {}, criarSocket, onEstado: (e) => estados.push(e) });

    socket.onopen();
    socket.onclose();
    expect(estados).toEqual(['conectando', 'conectado', 'desconectado']);
  });

  it('fechar por nossa conta não vira desconectado na tela', () => {
    darSessao();
    const { socket, criarSocket } = socketFalso();
    const estados = [];
    const fechar = assinarLog('r1', { onEvento: () => {}, criarSocket, onEstado: (e) => estados.push(e) });

    fechar();
    socket.onclose();
    expect(socket.close).toHaveBeenCalled();
    expect(estados).not.toContain('desconectado');
  });

  it('falha ao construir o socket vira erro, não exceção', () => {
    darSessao();
    const estados = [];
    const fechar = assinarLog('r1', {
      onEvento: () => {},
      onEstado: (e) => estados.push(e),
      criarSocket: () => { throw new Error('sem rede'); },
    });

    expect(estados).toEqual(['erro']);
    expect(() => fechar()).not.toThrow();
  });
});

describe('só a camada de serviços abre WebSocket', () => {
  it('nenhum componente nem tela instancia WebSocket direto', () => {
    // Ancorado na raiz do processo: em jsdom o `import.meta.url` não é uma URL de arquivo.
    const raiz = path.join(process.cwd(), 'src');
    const problemas = [];
    const caminhar = (pasta) => {
      for (const entrada of fs.readdirSync(pasta, { withFileTypes: true })) {
        const caminho = path.join(pasta, entrada.name);
        if (entrada.isDirectory()) { caminhar(caminho); continue; }
        if (!/\.jsx?$/.test(entrada.name) || /\.test\.jsx?$/.test(entrada.name)) continue;
        if (/new\s+(globalThis\.)?WebSocket\s*\(/.test(fs.readFileSync(caminho, 'utf8'))) problemas.push(caminho);
      }
    };
    for (const pasta of ['components', 'features']) caminhar(path.join(raiz, pasta));
    expect(problemas).toEqual([]);
  });
});
