import fs from 'node:fs';
import path from 'node:path';

// Resolução do executável de um comando da whitelist (ADR-002, controle C3).
//
// No Windows um comando não é sempre um `.exe`. `npm` e `npx` são scripts `.cmd`, e o Node recusa
// dar `spawn` em `.cmd` sem shell desde a correção do CVE-2024-27980: erro `EINVAL`. Ligar o shell
// para contornar isso quebraria o controle mais importante do runner, então a saída é outra:
// executar o próprio Node apontando para o CLI em JavaScript, que é exatamente o que o `.cmd` faz
// por dentro. Continua sem shell, sem interpolação e com array de argumentos.
//
// Tudo aqui parte de `process.execPath` e do `PATH` do sistema. Nada vem de preset, blueprint ou
// entrada do usuário, e por isso o caminho absoluto que sai daqui não passa (nem deve passar) pela
// allowlist de argumento, que existe para o argumento declarado.

const EXTENSOES_PADRAO = '.COM;.EXE;.BAT;.CMD';

// Só estas duas o Node executa sem shell. `.bat` e `.cmd` ficam de fora de propósito.
const EXTENSOES_SPAWNAVEIS = new Set(['.COM', '.EXE']);

// Comandos que no Windows são script e têm um CLI em JavaScript equivalente.
const CLI_EM_JS = Object.freeze({ npm: 'npm-cli.js', npx: 'npx-cli.js' });

export function ehWindows(plataforma = process.platform) {
  return plataforma === 'win32';
}

function ehArquivo(alvo) {
  try {
    return fs.statSync(alvo).isFile();
  } catch {
    return false;
  }
}

// O CLI do npm mora ao lado do binário do Node. O layout muda entre a instalação oficial do
// Windows e os gerenciadores de versão, então vale tentar os dois lugares conhecidos.
export function localizarCliDoNode(cmd, execPath = process.execPath) {
  const arquivo = CLI_EM_JS[cmd];
  if (!arquivo) return null;
  const raiz = path.dirname(execPath);
  const candidatos = [
    path.join(raiz, 'node_modules', 'npm', 'bin', arquivo),
    path.join(raiz, '..', 'lib', 'node_modules', 'npm', 'bin', arquivo),
  ];
  for (const candidato of candidatos) {
    if (ehArquivo(candidato)) return path.normalize(candidato);
  }
  return null;
}

// O PATHEXT vem em maiúsculas e o disco quase sempre está em minúsculas. Como o Windows ignora a
// caixa, o `spawn` funcionaria de qualquer jeito, mas o caminho vai parar em log e em mensagem de
// erro, e ali ele precisa ser o caminho de verdade.
function caixaReal(alvo) {
  try {
    return fs.realpathSync.native(alvo);
  } catch {
    return alvo;
  }
}

// Busca no PATH respeitando o PATHEXT, e ignora de propósito a correspondência sem extensão: no
// Windows um arquivo sem extensão não é executável, e o diretório do Node tem justamente um `npm`
// sem extensão, que é script de shell.
export function procurarNoPath(cmd, ambiente = process.env) {
  const extensoes = String(ambiente.PATHEXT || EXTENSOES_PADRAO)
    .split(';')
    .map((extensao) => extensao.trim())
    .filter(Boolean);
  const diretorios = String(ambiente.PATH || '').split(path.delimiter).filter(Boolean);
  for (const diretorio of diretorios) {
    for (const extensao of extensoes) {
      if (!EXTENSOES_SPAWNAVEIS.has(extensao.toUpperCase())) continue;
      const alvo = path.join(diretorio, cmd + extensao);
      if (ehArquivo(alvo)) return caixaReal(alvo);
    }
  }
  return null;
}

// Devolve o arquivo a executar e o prefixo de argumentos que vem antes dos argumentos declarados.
// Fora do Windows nada muda: o comando vai para o `spawn` do jeito que o preset declarou.
export function resolverExecutavel(cmd, opcoes = {}) {
  const { plataforma = process.platform, execPath = process.execPath, ambiente = process.env } = opcoes;
  if (!ehWindows(plataforma)) return { arquivo: cmd, prefixo: [] };

  const cli = localizarCliDoNode(cmd, execPath);
  if (cli) return { arquivo: execPath, prefixo: [cli] };

  const achado = procurarNoPath(cmd, ambiente);
  if (achado) return { arquivo: achado, prefixo: [] };

  // Não achou nada spawnável. Devolve o nome original para o `spawn` falhar com a mensagem do
  // sistema, que é o caminho que o runner já sabe tratar, em vez de estourar exceção aqui.
  return { arquivo: cmd, prefixo: [] };
}
