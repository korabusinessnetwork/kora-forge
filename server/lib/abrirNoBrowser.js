import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { abridorDaPlataforma } from './abrirPasta.js';

// Abrir o Forge no browser já com o token de sessão, no fim do boot. É o Princípio nº 1 aplicado ao
// próprio Forge: o link existe, o terminal o imprime, e ninguém deveria precisar caçá-lo e colá-lo.
//
// Como abrirPasta.js, isto executa processo e não passa pela whitelist do runner (ADR-002, C7):
// é capacidade própria do Forge (ADR-010). Binário fixo por plataforma, argumento único, e o
// argumento é um caminho dentro de FORGE_HOME. Nada vem de preset, blueprint ou requisição.
//
// Abrir é conveniência, nunca dependência: se falhar, o link continua impresso no terminal.
//
// ## Por que um arquivo intermediário, e não a URL direto no abridor
//
// O token vai no fragmento (`#token=`) justamente para nunca chegar ao servidor. Só que o
// `explorer` do Windows **descarta o fragmento** ao repassar a URL para o browser, e o usuário cai
// na tela de "abra pelo link do terminal" mesmo tendo aberto pelo link. Testado nesta máquina.
//
// Cada plataforma trata fragmento de um jeito e nada disso é documentado, então a saída é não
// depender disso: o Forge grava uma página mínima em FORGE_HOME e manda o abridor abrir **o
// arquivo**. Quem monta a URL final, fragmento e tudo, é o próprio browser, executando a página.
// Some a variável de plataforma inteira.
//
// A página carrega o token, então nasce na mesma pasta onde `session.key` já vive, pede modo 0600 e
// é apagada assim que o browser teve tempo de lê-la. Nunca vai para o workspace nem para o repo.
//
// Sobre o 0600: no Windows o chmod do Node só alterna o bit de somente-leitura, então o modo é
// pedido e não garantido. Vale o mesmo para o `session.key` que o boot.js grava, e a proteção real
// nos dois casos é a mesma, o arquivo viver dentro do perfil do usuário. Aqui há uma proteção a
// mais que o `session.key` não tem: a página some do disco em segundos.

// http://127.0.0.1:<porta>/#token=<32 bytes em hex>. Host fixo por S-01.
const URL_DE_SESSAO = /^http:\/\/127\.0\.0\.1:\d{1,5}\/#token=[0-9a-f]{64}$/;

export const ARQUIVO_DE_ABERTURA = 'abrir.html';
const MS_ATE_APAGAR = 15000;

export function urlDeSessaoValida(url) {
  return typeof url === 'string' && URL_DE_SESSAO.test(url);
}

// Chamada no boot e no encerramento. O timer de dentro do abrirNoBrowser some junto com o processo
// se o Forge for morto nos primeiros segundos, e aí a página sobreviveria até o boot seguinte.
// O token dela morre com o processo de qualquer forma, mas arquivo com segredo não fica no disco
// por descuido.
export function apagarPaginaDeAbertura(home, fsImpl = fs) {
  if (typeof home !== 'string' || home.trim() === '') return false;
  try {
    fsImpl.rmSync(path.join(home, ARQUIVO_DE_ABERTURA), { force: true });
    return true;
  } catch {
    return false;
  }
}

// A URL já passou pelo regex acima, então não tem aspas nem sinal de menor. Ainda assim escapa,
// porque o dia em que o formato mudar esta função não pode virar injeção de HTML.
function escaparParaAtributo(texto) {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function paginaDeAbertura(url) {
  const seguro = escaparParaAtributo(url);
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Abrindo o Kora Forge</title>
<meta name="robots" content="noindex">
</head>
<body style="background:#0f1115;color:#e6e8ec;font:14px system-ui,sans-serif;padding:40px">
<p>Abrindo o Kora Forge…</p>
<p><a id="link" href="${seguro}">Se não abrir sozinho, clique aqui.</a></p>
<script>location.replace(document.getElementById('link').href);</script>
</body>
</html>
`;
}

export function abrirNoBrowser(url, opcoes = {}) {
  const {
    home,
    plataforma = process.platform,
    spawnImpl = spawn,
    fsImpl = fs,
    msAteApagar = MS_ATE_APAGAR,
  } = opcoes;

  if (!urlDeSessaoValida(url)) return { aberto: false, motivo: 'url-fora-do-formato' };
  if (typeof home !== 'string' || home.trim() === '') return { aberto: false, motivo: 'home-ausente' };

  const arquivo = path.join(home, ARQUIVO_DE_ABERTURA);
  try {
    fsImpl.writeFileSync(arquivo, paginaDeAbertura(url), { encoding: 'utf8', mode: 0o600 });
    fsImpl.chmodSync(arquivo, 0o600);
  } catch {
    return { aberto: false, motivo: 'falha-ao-gravar' };
  }

  const processo = spawnImpl(abridorDaPlataforma(plataforma), [arquivo], {
    shell: false,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  // Solta o processo: o browser vive além do Forge, e falhar ao abrir não pode derrubar o servidor
  // nem virar exceção não tratada.
  processo.on?.('error', () => {});
  processo.unref?.();

  // A página é descartável e carrega o token. Sai do disco assim que o browser teve tempo de abrir.
  const relogio = setTimeout(() => {
    try { fsImpl.rmSync(arquivo, { force: true }); } catch { /* some no próximo boot */ }
  }, msAteApagar);
  relogio.unref?.();

  return { aberto: true, arquivo };
}

// O Vite sobe em paralelo com a API no `npm run forge`, e quase sempre depois dela. Sem esperar, o
// browser abriria numa porta morta e o usuário veria erro de conexão em vez do Forge.
export function esperarPorta(porta, opcoes = {}) {
  const {
    host = '127.0.0.1',
    timeoutMs = 20000,
    intervaloMs = 250,
    conectar = net.connect,
  } = opcoes;
  const limite = Date.now() + timeoutMs;

  return new Promise((resolve) => {
    const tentar = () => {
      const soquete = conectar({ host, port: porta });
      let decidido = false;
      const encerrar = (respondeu) => {
        if (decidido) return;
        decidido = true;
        soquete.destroy?.();
        if (respondeu) return resolve(true);
        if (Date.now() >= limite) return resolve(false);
        setTimeout(tentar, intervaloMs).unref?.();
      };
      soquete.once('connect', () => encerrar(true));
      soquete.once('error', () => encerrar(false));
    };
    tentar();
  });
}
