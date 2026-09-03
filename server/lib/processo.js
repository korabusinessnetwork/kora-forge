import { spawn } from 'node:child_process';
import { COMANDOS_PERMITIDOS } from '../../shared/comandos.js';
import { ErroForge } from './erro.js';

// Execução de processo do sistema. A parte mais perigosa do produto (ADR-002, controle C3):
// nunca `exec`, nunca shell, nunca interpolação de string. Só spawn com array de argumentos.
const ARGUMENTO_PERMITIDO = /^[a-zA-Z0-9._@/=:-]*$/;

// Ambiente montado do zero: nada do processo do Forge vaza para o filho, e o cofre nunca entra.
// O que passa é o mínimo para o processo existir, mais a configuração de rede. Sem as variáveis
// de proxy o `npm install` simplesmente trava em qualquer máquina atrás de proxy, e instalar
// dependência é justamente o que o comando existe para fazer. Proxy é configuração, não segredo;
// ainda assim, o ambiente nunca é logado, porque uma URL de proxy pode embutir credencial.
const VARIAVEIS_DO_SISTEMA = ['PATH', 'HOME', 'LANG', 'LC_ALL', 'TZ', 'SystemRoot', 'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'ProgramFiles', 'ProgramData', 'ComSpec', 'PATHEXT'];
const VARIAVEIS_DE_REDE = [
  'HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY', 'http_proxy', 'https_proxy', 'no_proxy',
  'NODE_EXTRA_CA_CERTS', 'SSL_CERT_FILE', 'SSL_CERT_DIR',
  'npm_config_proxy', 'npm_config_https_proxy', 'npm_config_noproxy', 'npm_config_registry', 'npm_config_cafile',
];
const VARIAVEIS_MINIMAS = [...VARIAVEIS_DO_SISTEMA, ...VARIAVEIS_DE_REDE];

export function ambienteMinimo(origem = process.env) {
  const ambiente = {};
  for (const nome of VARIAVEIS_MINIMAS) {
    if (origem[nome] !== undefined) ambiente[nome] = origem[nome];
  }
  return ambiente;
}

export function validarComando({ cmd, args }) {
  if (!COMANDOS_PERMITIDOS.includes(cmd)) {
    throw new ErroForge('FORGE_CMD_NOT_ALLOWED', `O comando "${cmd}" não está na whitelist.`, { issues: [{ caminho: 'cmd', mensagem: cmd }] });
  }
  for (const argumento of args) {
    if (typeof argumento !== 'string' || !ARGUMENTO_PERMITIDO.test(argumento)) {
      throw new ErroForge('FORGE_CMD_NOT_ALLOWED', `Argumento com caractere não permitido: ${argumento}`, { issues: [{ caminho: 'args', mensagem: String(argumento) }] });
    }
  }
}

// Quebra o fluxo em linhas sem perder o resto entre pedaços.
function criarQuebradorDeLinhas(stream, aoReceber) {
  let resto = '';
  return (pedaco) => {
    const texto = resto + pedaco.toString('utf8');
    const linhas = texto.split(/\r?\n/);
    resto = linhas.pop() ?? '';
    for (const linha of linhas) aoReceber(stream, linha);
  };
}

export function executar({ cmd, args, cwd, timeoutMs, onLinha = () => {}, longaDuracao = false }) {
  validarComando({ cmd, args });

  const processo = spawn(cmd, args, {
    cwd,
    shell: false,
    env: ambienteMinimo(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  processo.stdout.on('data', criarQuebradorDeLinhas('stdout', onLinha));
  processo.stderr.on('data', criarQuebradorDeLinhas('stderr', onLinha));

  let temporizador = null;
  const terminou = new Promise((resolver) => {
    let respondido = false;
    const responder = (resultado) => {
      if (respondido) return;
      respondido = true;
      if (temporizador) clearTimeout(temporizador);
      resolver(resultado);
    };

    processo.on('error', (erro) => responder({ estado: 'falha', exitCode: null, erro: erro.message }));
    processo.on('close', (codigo, sinal) => {
      if (processo.forgeTimeout) return responder({ estado: 'timeout', exitCode: codigo, erro: `Tempo esgotado depois de ${timeoutMs} ms.` });
      if (processo.forgeParado) return responder({ estado: 'cancelado', exitCode: codigo, erro: null });
      if (codigo === 0) return responder({ estado: 'sucesso', exitCode: 0, erro: null });
      return responder({ estado: 'falha', exitCode: codigo, erro: sinal ? `Encerrado pelo sinal ${sinal}.` : `Saiu com código ${codigo}.` });
    });

    if (!longaDuracao && Number.isFinite(timeoutMs)) {
      temporizador = setTimeout(() => {
        processo.forgeTimeout = true;
        processo.kill('SIGKILL');
      }, timeoutMs);
      temporizador.unref?.();
    }
  });

  return { processo, terminou };
}

export function parar(processo) {
  if (!processo || processo.exitCode !== null || processo.signalCode !== null) return false;
  processo.forgeParado = true;
  processo.kill('SIGTERM');
  // Se não morrer sozinho, mata de vez. O usuário pediu para parar, e parar significa parar.
  const forcar = setTimeout(() => processo.kill('SIGKILL'), 3000);
  forcar.unref?.();
  return true;
}
