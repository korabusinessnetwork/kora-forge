import { describe, it, expect, vi, afterEach } from 'vitest';
import { ehWindows, opcoesDeGrupo, matarArvore } from './arvore.js';

function processoFalso(pid = 4242) {
  return { pid, kill: vi.fn() };
}

function spawnFalso() {
  const chamadas = [];
  const filho = { on: vi.fn(), unref: vi.fn() };
  const impl = vi.fn((arquivo, args, opcoes) => {
    chamadas.push({ arquivo, args, opcoes });
    return filho;
  });
  return { impl, chamadas, filho };
}

describe('ehWindows', () => {
  it('separa Windows do resto', () => {
    expect(ehWindows('win32')).toBe(true);
    expect(ehWindows('linux')).toBe(false);
    expect(ehWindows('darwin')).toBe(false);
  });
});

describe('opcoesDeGrupo', () => {
  it('em POSIX o filho lidera o próprio grupo', () => {
    expect(opcoesDeGrupo('linux')).toEqual({ detached: true });
    expect(opcoesDeGrupo('darwin')).toEqual({ detached: true });
  });

  it('no Windows nada muda, porque detached não ajudaria', () => {
    expect(opcoesDeGrupo('win32')).toEqual({});
  });
});

describe('matarArvore no Windows', () => {
  it('chama taskkill com /T e /F, sem shell e com array de argumentos', () => {
    const { impl, chamadas } = spawnFalso();
    expect(matarArvore(processoFalso(1234), { plataforma: 'win32', spawnImpl: impl })).toBe(true);

    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].arquivo).toBe('taskkill');
    expect(chamadas[0].args).toEqual(['/T', '/F', '/PID', '1234']);
    expect(chamadas[0].opcoes.shell).toBe(false);
  });

  it('solta o processo, para o taskkill completar mesmo se o Forge sair em seguida', () => {
    const { impl, filho } = spawnFalso();
    matarArvore(processoFalso(), { plataforma: 'win32', spawnImpl: impl });
    expect(filho.unref).toHaveBeenCalled();
    expect(filho.on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('taskkill ausente cai para o kill de sempre, sem lançar', () => {
    const { impl, filho } = spawnFalso();
    const processo = processoFalso();
    matarArvore(processo, { plataforma: 'win32', spawnImpl: impl });

    const aoFalhar = filho.on.mock.calls.find(([nome]) => nome === 'error')[1];
    expect(() => aoFalhar(new Error('ENOENT'))).not.toThrow();
    expect(processo.kill).toHaveBeenCalledWith('SIGKILL');
  });

  it('o pid entra como argumento, nunca interpolado em texto de comando', () => {
    const { impl, chamadas } = spawnFalso();
    matarArvore(processoFalso(999), { plataforma: 'win32', spawnImpl: impl });
    // Cada argumento é um item do array, e nenhum deles carrega o comando inteiro montado.
    expect(chamadas[0].args.every((a) => !a.includes(' '))).toBe(true);
  });
});

describe('matarArvore em POSIX', () => {
  const original = process.kill;
  afterEach(() => { process.kill = original; });

  it('manda o sinal para o grupo inteiro, com o pid negativo', () => {
    const chamadas = [];
    process.kill = vi.fn((pid, sinal) => chamadas.push([pid, sinal]));

    expect(matarArvore(processoFalso(555), { plataforma: 'linux', sinal: 'SIGTERM' })).toBe(true);
    expect(chamadas).toEqual([[-555, 'SIGTERM']]);
  });

  it('leva o sinal que recebeu, e o SIGKILL do segundo estágio também vai para o grupo', () => {
    const chamadas = [];
    process.kill = vi.fn((pid, sinal) => chamadas.push([pid, sinal]));

    matarArvore(processoFalso(7), { plataforma: 'darwin', sinal: 'SIGKILL' });
    expect(chamadas).toEqual([[-7, 'SIGKILL']]);
  });

  it('grupo inexistente cai para o processo em si, sem lançar', () => {
    process.kill = vi.fn(() => { throw new Error('ESRCH'); });
    const processo = processoFalso();

    expect(matarArvore(processo, { plataforma: 'linux', sinal: 'SIGTERM' })).toBe(false);
    expect(processo.kill).toHaveBeenCalledWith('SIGTERM');
  });

  it('processo que morre entre uma tentativa e outra não derruba nada', () => {
    process.kill = vi.fn(() => { throw new Error('ESRCH'); });
    const processo = { pid: 1, kill: vi.fn(() => { throw new Error('ESRCH'); }) };

    expect(() => matarArvore(processo, { plataforma: 'linux' })).not.toThrow();
  });

  it('nunca usa taskkill fora do Windows', () => {
    const { impl } = spawnFalso();
    process.kill = vi.fn();
    matarArvore(processoFalso(), { plataforma: 'linux', spawnImpl: impl });
    expect(impl).not.toHaveBeenCalled();
  });
});

describe('matarArvore sem processo', () => {
  it('processo ausente ou sem pid devolve false e não chama nada', () => {
    const { impl } = spawnFalso();
    for (const entrada of [null, undefined, {}, { pid: undefined }]) {
      expect(matarArvore(entrada, { plataforma: 'win32', spawnImpl: impl })).toBe(false);
    }
    expect(impl).not.toHaveBeenCalled();
  });
});
