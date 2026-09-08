import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { garantirDentro } from './caminhos.js';
import { ErroForge } from './erro.js';

// Mesmo formato de erro de campo que o gerador usa, para a tela conseguir apontar o campo culpado.
function erroCampo(caminho, mensagem) {
  return new ErroForge('FORGE_VALIDATION', mensagem, { issues: [{ caminho, mensagem }] });
}

// Abrir a pasta do projeto no gerenciador de arquivos do sistema. É a última ação do fluxo F-01:
// o projeto nasceu, e o dono chega nele sem digitar caminho nem abrir terminal.
//
// Isto executa processo, mas não é o runner e não passa pela whitelist do preset (ADR-002, C7).
// É capacidade própria do Forge, e por isso os controles são mais apertados que os de lá:
// o binário é fixo por plataforma e escolhido aqui, o argumento é um só, e esse argumento é a
// raiz do projeto validada contra o workspace. Nada vem de preset, blueprint ou corpo de
// requisição, então não existe superfície de injeção para proteger.

const ABRIDOR_POR_PLATAFORMA = Object.freeze({ win32: 'explorer', darwin: 'open' });
const ABRIDOR_PADRAO = 'xdg-open';

export function abridorDaPlataforma(plataforma = process.platform) {
  return ABRIDOR_POR_PLATAFORMA[plataforma] ?? ABRIDOR_PADRAO;
}

// O `explorer` do Windows devolve código 1 mesmo quando abriu a janela, então exit code aqui não
// significa nada e não é verificado. O que importa é o processo ter sido iniciado.
export function abrirPasta(workspace, raizDoProjeto, opcoes = {}) {
  const { plataforma = process.platform, spawnImpl = spawn } = opcoes;

  if (typeof workspace !== 'string' || workspace.trim() === '') {
    throw erroCampo('workspace', 'Configure o workspace em Configurações antes de abrir a pasta de um projeto.');
  }
  if (typeof raizDoProjeto !== 'string' || raizDoProjeto.trim() === '') {
    throw erroCampo('projeto', 'Este projeto ainda não foi materializado, então não existe pasta para abrir.');
  }

  const alvo = garantirDentro(workspace, raizDoProjeto);

  let ehPasta = false;
  try {
    ehPasta = fs.statSync(alvo).isDirectory();
  } catch {
    ehPasta = false;
  }
  if (!ehPasta) {
    throw erroCampo('projeto', 'A pasta do projeto não está mais no disco. Ela pode ter sido movida ou apagada.');
  }

  const processo = spawnImpl(abridorDaPlataforma(plataforma), [alvo], {
    shell: false,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  // Solta o processo: o gerenciador de arquivos vive além do Forge, e uma falha ao abrir não pode
  // derrubar o servidor nem virar exceção não tratada.
  processo.on?.('error', () => {});
  processo.unref?.();

  return { aberto: true };
}
