import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  ARQUIVO_DE_ABERTURA,
  abrirNoBrowser,
  apagarPaginaDeAbertura,
  esperarPorta,
  paginaDeAbertura,
  urlDeSessaoValida,
} from './abrirNoBrowser.js';

const TOKEN = 'a'.repeat(64);
const URL_OK = `http://127.0.0.1:5173/#token=${TOKEN}`;

const temporarias = [];
afterEach(() => {
  while (temporarias.length > 0) fs.rmSync(temporarias.pop(), { recursive: true, force: true });
});

function homeTemporaria() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'kora-forge-abrir-browser-'));
  temporarias.push(home);
  return home;
}

function spawnFalso() {
  const chamadas = [];
  const impl = vi.fn((arquivo, args, opcoes) => {
    chamadas.push({ arquivo, args, opcoes });
    return { on: vi.fn(), unref: vi.fn() };
  });
  return { impl, chamadas };
}

// Soquete de mentira: emite connect ou error no próximo tick, como o net.connect faria.
function soqueteFalso(vaiConectar) {
  const soquete = new EventEmitter();
  soquete.destroy = vi.fn();
  queueMicrotask(() => soquete.emit(vaiConectar ? 'connect' : 'error', new Error('recusado')));
  return soquete;
}

describe('urlDeSessaoValida', () => {
  it('aceita a URL que o boot monta', () => {
    expect(urlDeSessaoValida(URL_OK)).toBe(true);
    expect(urlDeSessaoValida(`http://127.0.0.1:7337/#token=${TOKEN}`)).toBe(true);
  });

  it.each([
    ['host que não é loopback', `http://192.168.0.10:5173/#token=${TOKEN}`],
    ['localhost por nome', `http://localhost:5173/#token=${TOKEN}`],
    ['sem token', 'http://127.0.0.1:5173/'],
    ['token curto', 'http://127.0.0.1:5173/#token=abc'],
    ['token fora do hex', `http://127.0.0.1:5173/#token=${'z'.repeat(64)}`],
    ['outro esquema', `file:///c:/#token=${TOKEN}`],
    ['argumento de linha de comando coado na URL', `http://127.0.0.1:5173/#token=${TOKEN} --algo`],
    ['nada', null],
  ])('recusa %s', (_, url) => {
    expect(urlDeSessaoValida(url)).toBe(false);
  });
});

describe('paginaDeAbertura', () => {
  it('leva a URL inteira, com o fragmento, para dentro do href', () => {
    expect(paginaDeAbertura(URL_OK)).toContain(`href="${URL_OK}"`);
  });

  it('escapa aspas e sinal de menor, para o dia em que o formato da URL mudar', () => {
    const html = paginaDeAbertura('http://x/"><script>alert(1)</script>');
    expect(html).not.toContain('"><script>alert(1)');
    expect(html).toContain('&quot;&gt;&lt;script&gt;');
  });
});

describe('abrirNoBrowser', () => {
  it('grava a página e manda o abridor abrir o ARQUIVO, nunca a URL', () => {
    const home = homeTemporaria();
    const { impl, chamadas } = spawnFalso();

    const resultado = abrirNoBrowser(URL_OK, { home, plataforma: 'win32', spawnImpl: impl });

    const arquivo = path.join(home, ARQUIVO_DE_ABERTURA);
    expect(resultado).toEqual({ aberto: true, arquivo });
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].arquivo).toBe('explorer');
    // O fragmento não passa pela linha de comando: é isso que o explorer do Windows descartava.
    expect(chamadas[0].args).toEqual([arquivo]);
    expect(chamadas[0].args[0]).not.toContain('#token=');
    expect(chamadas[0].opcoes.shell).toBe(false);
    expect(fs.readFileSync(arquivo, 'utf8')).toContain(URL_OK);
  });

  it('usa o abridor de cada plataforma', () => {
    for (const [plataforma, esperado] of [['darwin', 'open'], ['linux', 'xdg-open']]) {
      const { impl, chamadas } = spawnFalso();
      abrirNoBrowser(URL_OK, { home: homeTemporaria(), plataforma, spawnImpl: impl });
      expect(chamadas[0].arquivo).toBe(esperado);
    }
  });

  it('apaga a página depois da janela combinada, para o token não ficar no disco', async () => {
    const home = homeTemporaria();
    const { impl } = spawnFalso();
    const arquivo = path.join(home, ARQUIVO_DE_ABERTURA);

    abrirNoBrowser(URL_OK, { home, plataforma: 'linux', spawnImpl: impl, msAteApagar: 1 });
    expect(fs.existsSync(arquivo)).toBe(true);

    await new Promise((r) => setTimeout(r, 30));
    expect(fs.existsSync(arquivo)).toBe(false);
  });

  it('URL fora do formato não grava arquivo nem chama spawn', () => {
    const home = homeTemporaria();
    const { impl } = spawnFalso();

    expect(abrirNoBrowser('http://exemplo.com', { home, plataforma: 'linux', spawnImpl: impl }))
      .toEqual({ aberto: false, motivo: 'url-fora-do-formato' });
    expect(fs.existsSync(path.join(home, ARQUIVO_DE_ABERTURA))).toBe(false);
    expect(impl).not.toHaveBeenCalled();
  });

  it('sem home não tenta nada', () => {
    const { impl } = spawnFalso();
    expect(abrirNoBrowser(URL_OK, { home: '  ', plataforma: 'linux', spawnImpl: impl }))
      .toEqual({ aberto: false, motivo: 'home-ausente' });
    expect(impl).not.toHaveBeenCalled();
  });

  it('falha ao gravar vira retorno, não exceção que derrube o boot', () => {
    const { impl } = spawnFalso();
    const fsQuebrado = { writeFileSync: () => { throw new Error('disco cheio'); }, chmodSync: vi.fn(), rmSync: vi.fn() };

    expect(abrirNoBrowser(URL_OK, { home: homeTemporaria(), plataforma: 'linux', spawnImpl: impl, fsImpl: fsQuebrado }))
      .toEqual({ aberto: false, motivo: 'falha-ao-gravar' });
    expect(impl).not.toHaveBeenCalled();
  });

  it('solta o processo e engole erro do spawn', () => {
    const solto = { on: vi.fn(), unref: vi.fn() };
    abrirNoBrowser(URL_OK, { home: homeTemporaria(), plataforma: 'linux', spawnImpl: () => solto });
    expect(solto.unref).toHaveBeenCalled();
    expect(solto.on).toHaveBeenCalledWith('error', expect.any(Function));
  });
});

describe('apagarPaginaDeAbertura', () => {
  it('apaga a sobra de um boot que morreu antes de limpar', () => {
    const home = homeTemporaria();
    const arquivo = path.join(home, ARQUIVO_DE_ABERTURA);
    fs.writeFileSync(arquivo, 'sobra');

    expect(apagarPaginaDeAbertura(home)).toBe(true);
    expect(fs.existsSync(arquivo)).toBe(false);
  });

  it('não reclama quando não há nada para apagar', () => {
    expect(apagarPaginaDeAbertura(homeTemporaria())).toBe(true);
  });

  it('home vazia é no-op, nunca exceção no encerramento', () => {
    expect(apagarPaginaDeAbertura('  ')).toBe(false);
    expect(apagarPaginaDeAbertura(null)).toBe(false);
  });

  it('erro de disco não escapa, para não travar o encerramento', () => {
    const fsQuebrado = { rmSync: () => { throw new Error('em uso'); } };
    expect(apagarPaginaDeAbertura(homeTemporaria(), fsQuebrado)).toBe(false);
  });
});

describe('esperarPorta', () => {
  it('resolve true assim que a porta aceita conexão', async () => {
    const conectar = vi.fn(() => soqueteFalso(true));
    await expect(esperarPorta(5173, { conectar })).resolves.toBe(true);
    expect(conectar).toHaveBeenCalledWith({ host: '127.0.0.1', port: 5173 });
  });

  it('tenta de novo enquanto a porta recusa, e desiste no timeout', async () => {
    const conectar = vi.fn(() => soqueteFalso(false));
    await expect(esperarPorta(5173, { conectar, timeoutMs: 0, intervaloMs: 1 })).resolves.toBe(false);
    expect(conectar).toHaveBeenCalledTimes(1);
  });

  it('insiste até a porta subir', async () => {
    let tentativas = 0;
    const conectar = vi.fn(() => soqueteFalso(++tentativas >= 3));
    await expect(esperarPorta(5173, { conectar, timeoutMs: 5000, intervaloMs: 1 })).resolves.toBe(true);
    expect(tentativas).toBe(3);
  });

  it('fecha o soquete de cada tentativa', async () => {
    const soquetes = [];
    const conectar = vi.fn(() => {
      const s = soqueteFalso(true);
      soquetes.push(s);
      return s;
    });
    await esperarPorta(5173, { conectar });
    expect(soquetes[0].destroy).toHaveBeenCalled();
  });
});
