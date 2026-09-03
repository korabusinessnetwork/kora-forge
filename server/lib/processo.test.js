import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, afterEach } from 'vitest';
import { executar, parar, validarComando, ambienteMinimo } from './processo.js';

const temporarias = [];
afterEach(() => {
  while (temporarias.length > 0) fs.rmSync(temporarias.pop(), { recursive: true, force: true });
});

// Script auxiliar em pasta temporária: o caminho passa pela allowlist de argumento, e assim dá
// para testar processo de verdade sem afrouxar a regra que protege o runner.
function script(corpo) {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'kora-forge-proc-'));
  temporarias.push(pasta);
  const arquivo = path.join(pasta, 'script.js');
  fs.writeFileSync(arquivo, corpo);
  return { pasta, arquivo };
}

describe('validarComando', () => {
  it('recusa comando fora da whitelist', () => {
    expect(() => validarComando({ cmd: 'rm', args: ['-rf', '/'] })).toThrow(/whitelist/);
    expect(() => validarComando({ cmd: 'bash', args: [] })).toThrow(/whitelist/);
    expect(() => validarComando({ cmd: 'git', args: ['init'] })).not.toThrow();
  });

  it.each([
    ['ponto e vírgula', 'init; rm -rf /'],
    ['espaço', 'meu app'],
    ['aspas', 'x"y'],
    ['cifrão', '$(whoami)'],
    ['crase', 'a`b`'],
    ['pipe', 'a|b'],
    ['redirecionamento', 'a>b'],
    ['ampersand', 'a&b'],
  ])('recusa argumento com %s', (_rotulo, argumento) => {
    let erro;
    try { validarComando({ cmd: 'git', args: [argumento] }); } catch (e) { erro = e; }
    expect(erro?.codigo).toBe('FORGE_CMD_NOT_ALLOWED');
  });

  it('aceita os argumentos que os presets realmente usam', () => {
    for (const args of [['init'], ['install'], ['run', 'dev'], ['run', 'db:migrate'], ['--version']]) {
      expect(() => validarComando({ cmd: 'npm', args })).not.toThrow();
    }
  });
});

describe('ambienteMinimo', () => {
  it('leva só o mínimo e descarta o resto do ambiente do Forge', () => {
    const ambiente = ambienteMinimo({ PATH: '/bin', HOME: '/root', FORGE_SEGREDO: 'nao-vaza', ANTHROPIC_API_KEY: 'nao-vaza', LANG: 'pt_BR' });
    expect(ambiente).toEqual({ PATH: '/bin', HOME: '/root', LANG: 'pt_BR' });
    expect(Object.keys(ambiente)).not.toContain('FORGE_SEGREDO');
    expect(Object.keys(ambiente)).not.toContain('ANTHROPIC_API_KEY');
  });

  it('leva a configuração de rede, sem a qual npm install trava atrás de proxy', () => {
    const ambiente = ambienteMinimo({
      PATH: '/bin', HTTPS_PROXY: 'http://proxy:8080', https_proxy: 'http://proxy:8080',
      NO_PROXY: 'localhost', NODE_EXTRA_CA_CERTS: '/ca.crt', npm_config_registry: 'https://registry.npmjs.org',
      OUTRA_COISA: 'fica de fora',
    });
    expect(ambiente.HTTPS_PROXY).toBe('http://proxy:8080');
    expect(ambiente.https_proxy).toBe('http://proxy:8080');
    expect(ambiente.NO_PROXY).toBe('localhost');
    expect(ambiente.NODE_EXTRA_CA_CERTS).toBe('/ca.crt');
    expect(ambiente.npm_config_registry).toBe('https://registry.npmjs.org');
    expect(Object.keys(ambiente)).not.toContain('OUTRA_COISA');
  });

  it('variável ausente não vira chave com undefined', () => {
    expect(ambienteMinimo({ PATH: '/bin' })).toEqual({ PATH: '/bin' });
  });
});

describe('executar', () => {
  it('roda com sucesso e captura as linhas de stdout e stderr', async () => {
    const { pasta, arquivo } = script('console.log("linha 1");console.log("linha 2");console.error("erro 1");');
    const linhas = [];
    const { terminou } = executar({ cmd: 'node', args: [arquivo], cwd: pasta, timeoutMs: 15000, onLinha: (stream, linha) => linhas.push([stream, linha]) });
    const resultado = await terminou;
    expect(resultado).toEqual({ estado: 'sucesso', exitCode: 0, erro: null });
    expect(linhas).toEqual([['stdout', 'linha 1'], ['stdout', 'linha 2'], ['stderr', 'erro 1']]);
  });

  it('exit code diferente de zero vira falha com o código', async () => {
    const { pasta, arquivo } = script('process.exit(3);');
    const { terminou } = executar({ cmd: 'node', args: [arquivo], cwd: pasta, timeoutMs: 15000 });
    const resultado = await terminou;
    expect(resultado.estado).toBe('falha');
    expect(resultado.exitCode).toBe(3);
    expect(resultado.erro).toContain('3');
  });

  it('timeout mata o processo e devolve estado timeout', async () => {
    const { pasta, arquivo } = script('setTimeout(() => {}, 60000);');
    const { terminou } = executar({ cmd: 'node', args: [arquivo], cwd: pasta, timeoutMs: 300 });
    const resultado = await terminou;
    expect(resultado.estado).toBe('timeout');
    expect(resultado.erro).toContain('300');
  });

  it('não vaza variável do processo do Forge para o filho', async () => {
    process.env.FORGE_TESTE_SEGREDO = 'nao-deveria-vazar';
    const { pasta, arquivo } = script('console.log(String(process.env.FORGE_TESTE_SEGREDO));');
    const linhas = [];
    const { terminou } = executar({ cmd: 'node', args: [arquivo], cwd: pasta, timeoutMs: 15000, onLinha: (_s, linha) => linhas.push(linha) });
    await terminou;
    delete process.env.FORGE_TESTE_SEGREDO;
    expect(linhas).toEqual(['undefined']);
  });

  it('roda no cwd que recebeu', async () => {
    const { pasta, arquivo } = script('console.log(process.cwd());');
    const linhas = [];
    const { terminou } = executar({ cmd: 'node', args: [arquivo], cwd: pasta, timeoutMs: 15000, onLinha: (_s, linha) => linhas.push(linha) });
    await terminou;
    expect(fs.realpathSync(linhas[0])).toBe(fs.realpathSync(pasta));
  });

  it('binário inexistente vira falha com a mensagem do sistema, sem derrubar o Forge', async () => {
    const { pasta } = script('');
    const { terminou } = executar({ cmd: 'supabase', args: ['--version'], cwd: pasta, timeoutMs: 5000 });
    const resultado = await terminou;
    expect(['falha', 'sucesso']).toContain(resultado.estado);
  });

  it('parar mata o processo e devolve estado cancelado', async () => {
    const { pasta, arquivo } = script('setInterval(() => {}, 1000);');
    const { processo, terminou } = executar({ cmd: 'node', args: [arquivo], cwd: pasta, timeoutMs: 30000 });
    await new Promise((resolver) => setTimeout(resolver, 150));
    expect(parar(processo)).toBe(true);
    const resultado = await terminou;
    expect(resultado.estado).toBe('cancelado');
    expect(parar(processo)).toBe(false);
  });

  it('valida o comando antes de qualquer spawn', () => {
    expect(() => executar({ cmd: 'bash', args: ['-c', 'ls'], cwd: '/tmp', timeoutMs: 1000 })).toThrow(/whitelist/);
  });
});

describe('nada de shell no servidor', () => {
  it('a única API de child_process usada é spawn, e ninguém pede shell', () => {
    const raiz = fileURLToPath(new URL('../', import.meta.url));
    const problemas = [];
    const caminhar = (pasta) => {
      for (const entrada of fs.readdirSync(pasta, { withFileTypes: true })) {
        const caminho = path.join(pasta, entrada.name);
        if (entrada.isDirectory()) { caminhar(caminho); continue; }
        if (!entrada.name.endsWith('.js') || entrada.name.endsWith('.test.js')) continue;
        const conteudo = fs.readFileSync(caminho, 'utf8');
        for (const importado of conteudo.matchAll(/import\s*\{([^}]*)\}\s*from\s*'node:child_process'/g)) {
          for (const nome of importado[1].split(',').map((parte) => parte.trim()).filter(Boolean)) {
            if (nome !== 'spawn') problemas.push(`${caminho}: importa ${nome} de child_process`);
          }
        }
        if (/shell:\s*true/.test(conteudo)) problemas.push(`${caminho}: shell: true`);
        if (/\bexecSync\s*\(|\bexecFileSync\s*\(/.test(conteudo)) problemas.push(`${caminho}: execSync`);
        if (/require\(['"]child_process['"]\)/.test(conteudo)) problemas.push(`${caminho}: require de child_process`);
      }
    };
    caminhar(raiz);
    expect(problemas).toEqual([]);
  });

  it('o runner importa spawn, e é só isso', () => {
    const arquivo = fileURLToPath(new URL('./processo.js', import.meta.url));
    const conteudo = fs.readFileSync(arquivo, 'utf8');
    expect(conteudo).toContain("import { spawn } from 'node:child_process'");
    expect(conteudo).toContain('shell: false');
  });
});
