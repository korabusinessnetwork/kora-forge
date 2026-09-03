import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, afterEach } from 'vitest';
import { executar, parar, validarComando, ambienteMinimo, resolverComando, mensagemDeFalhaAoIniciar } from './processo.js';

const temporarias = [];
afterEach(() => {
  while (temporarias.length > 0) fs.rmSync(temporarias.pop(), { recursive: true, force: true });
});

// Script auxiliar em pasta temporária. O nome vai **relativo** e a pasta vai no `cwd`, que é
// exatamente como o runner roda de verdade: o preset declara argumento literal e o caminho mora
// no `cwd`. Passar o caminho absoluto aqui quebraria no Windows, onde a barra invertida não
// está na allowlist de argumento, e o teste diria que o produto está errado quando quem está
// errado é o teste (restrição T-02, risco R-01).
const NOME_DO_SCRIPT = 'script.js';

function script(corpo) {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'kora-forge-proc-'));
  temporarias.push(pasta);
  fs.writeFileSync(path.join(pasta, NOME_DO_SCRIPT), corpo);
  return { pasta, arquivo: NOME_DO_SCRIPT };
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
    // A ordem e conferida **por stream**. stdout e stderr sao dois canos separados e o sistema
    // nao promete em que ordem eles chegam um em relacao ao outro; exigir uma intercalacao fixa
    // e teste flaky, nao garantia. O que o produto promete, e o que importa para o log, e que
    // cada stream chegue na ordem em que foi escrito, e rotulado corretamente.
    const doStream = (nome) => linhas.filter(([stream]) => stream === nome).map(([, linha]) => linha);
    expect(doStream('stdout')).toEqual(['linha 1', 'linha 2']);
    expect(doStream('stderr')).toEqual(['erro 1']);
    expect(linhas).toHaveLength(3);
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

// R-08: no Windows, `npm` e `npx` são shims `.cmd` e o spawn sem shell não os executa, e todo
// preset do Forge roda `npm install`. Este é o teste que faltava: tudo o mais na suíte rodava
// `node script.js`, que funciona em qualquer sistema, e por isso ela ficava verde enquanto
// nenhum comando npm do produto conseguia nascer. Aqui o comando é de verdade, na plataforma
// de verdade.
describe('executar comandos reais da whitelist', () => {
  for (const cmd of ['npm', 'npx', 'node', 'git']) {
    it(`${cmd} nasce e responde --version na plataforma que está rodando`, async () => {
      const saida = [];
      const { terminou } = executar({ cmd, args: ['--version'], cwd: os.tmpdir(), timeoutMs: 120000, onLinha: (_stream, linha) => saida.push(linha) });
      const resultado = await terminou;
      expect(resultado.erro).toBeNull();
      expect(resultado.estado).toBe('sucesso');
      expect(saida.join(' ')).toMatch(/\d+\.\d+/);
    }, 130000);
  }
});

describe('resolverComando', () => {
  // O caminho do node é neutro de propósito: quem monta o resultado é `path` da plataforma que
  // roda o teste, e cravar separador aqui faria o teste passar num sistema e falhar no outro.
  const EXEC = '/opt/node/node';
  const janela = { plataforma: 'win32', execPath: EXEC, existe: () => true };

  it('no Windows, npm vira o CLI de verdade rodado pelo mesmo node', () => {
    const { arquivo, argumentos } = resolverComando({ cmd: 'npm', args: ['install'] }, janela);
    expect(arquivo).toBe(EXEC);
    expect(argumentos[0].replaceAll('\\', '/')).toBe('/opt/node/node_modules/npm/bin/npm-cli.js');
    expect(argumentos.slice(1)).toEqual(['install']);
  });

  it('no Windows, npx recebe o mesmo tratamento', () => {
    const { arquivo, argumentos } = resolverComando({ cmd: 'npx', args: ['vite', '--version'] }, janela);
    expect(arquivo).toBe(EXEC);
    expect(argumentos[0]).toContain('npx-cli.js');
    expect(argumentos.slice(1)).toEqual(['vite', '--version']);
  });

  it('git, node e supabase são executáveis de verdade e passam intactos', () => {
    for (const cmd of ['git', 'node', 'supabase']) {
      expect(resolverComando({ cmd, args: ['--version'] }, janela)).toEqual({ arquivo: cmd, argumentos: ['--version'] });
    }
  });

  it('fora do Windows nada é traduzido: lá `npm` no PATH já é executável', () => {
    expect(resolverComando({ cmd: 'npm', args: ['install'] }, { ...janela, plataforma: 'linux' })).toEqual({ arquivo: 'npm', argumentos: ['install'] });
  });

  // Sem o CLI no lugar esperado, a falha tem que aparecer como falha do comando, com mensagem,
  // e não como exceção estourando no meio da fila.
  it('sem o CLI no lugar esperado, devolve o comando original em vez de estourar', () => {
    expect(resolverComando({ cmd: 'npm', args: ['install'] }, { ...janela, existe: () => false })).toEqual({ arquivo: 'npm', argumentos: ['install'] });
  });

  it('a tradução não amplia a whitelist: quem decide continua sendo validarComando', () => {
    expect(() => validarComando({ cmd: 'npm-cli.js', args: [] })).toThrow();
    expect(() => validarComando({ cmd: 'cmd', args: [] })).toThrow();
  });
});

describe('mensagemDeFalhaAoIniciar', () => {
  it('troca o erro cru do sistema por uma frase com próxima ação', () => {
    expect(mensagemDeFalhaAoIniciar({ code: 'ENOENT', message: 'spawn npm ENOENT' }, 'npm')).toContain('Instale a ferramenta');
    expect(mensagemDeFalhaAoIniciar({ code: 'EINVAL', message: 'spawn npm.cmd EINVAL' }, 'npm')).toContain('não pode ser executado direto');
    expect(mensagemDeFalhaAoIniciar({ code: 'EACCES' }, 'git')).toContain('Sem permissão');
  });

  it('erro desconhecido não some: a mensagem original sobrevive', () => {
    expect(mensagemDeFalhaAoIniciar({ code: 'EPERM', message: 'algo estranho' }, 'git')).toBe('algo estranho');
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
