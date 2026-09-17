import { spawn } from 'node:child_process';

// Parar um processo do runner e tudo que ele criou (R-12).
//
// Matar só o processo que o Forge criou não basta. `npm run dev` é `node npm-cli.js`, que cria o
// `vite`, que às vezes cria mais um. Matar o `npm` deixava o `vite` vivo, segurando a porta e os
// arquivos da pasta, e o botão Parar do bloco 7 não parava nada.
//
// Não existe caminho portátil, então são dois, e a assimetria é deliberada:
//
// - POSIX tem grupo de processo. O filho nasce em grupo próprio, com `detached`, e o sinal vai
//   para o grupo inteiro por `process.kill(-pid, sinal)`. Dá para ser gentil primeiro, porque
//   sinal ali significa alguma coisa.
// - Windows não tem grupo de processo, e `SIGTERM` não é sinal de verdade: o Node traduz para
//   encerramento abrupto do processo, e só dele. Quem sabe percorrer a árvore é o `taskkill`, com
//   `/T`. Como ele só encerra à força, com `/F`, no Windows parar é matar, sem estágio gentil.
//
// `taskkill` não entra em `COMANDOS_PERMITIDOS`: aquela lista limita o que um **preset** pode
// mandar executar. Aqui o binário é fixo, escolhido neste arquivo, e o único argumento variável é
// um pid que o próprio Forge criou. Nada vem de preset, blueprint ou requisição.

export function ehWindows(plataforma = process.platform) {
  return plataforma === 'win32';
}

// Em POSIX o filho precisa liderar o próprio grupo para o grupo poder ser morto sem levar junto o
// Forge. No Windows nada muda: `detached` não ajudaria e mudaria o comportamento sem ganho.
export function opcoesDeGrupo(plataforma = process.platform) {
  return ehWindows(plataforma) ? {} : { detached: true };
}

// Sai true quando conseguiu pedir a morte da árvore, false quando só deu para o processo em si.
function matarGrupoPosix(processo, sinal) {
  try {
    process.kill(-processo.pid, sinal);
    return true;
  } catch {
    // Grupo já morto, ou o processo não lidera grupo nenhum. Resta o de sempre.
    try {
      processo.kill(sinal);
    } catch {
      // já morreu entre uma coisa e outra
    }
    return false;
  }
}

function matarArvoreWindows(processo, spawnImpl) {
  const morte = spawnImpl('taskkill', ['/T', '/F', '/PID', String(processo.pid)], {
    shell: false,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  // Solto e sem stdio: completa mesmo que o Forge saia logo depois, que é o caso de encerrar o
  // servidor com um dev server rodando. Falha ao chamar não pode virar exceção não tratada, e
  // `taskkill` ausente cai para o kill de sempre, que ao menos mata o filho direto.
  morte?.on?.('error', () => {
    try {
      processo.kill('SIGKILL');
    } catch {
      // já morreu
    }
  });
  morte?.unref?.();
  return true;
}

// Mata o processo e os descendentes dele. `sinal` vale só em POSIX; no Windows é sempre à força.
export function matarArvore(processo, opcoes = {}) {
  const { sinal = 'SIGTERM', plataforma = process.platform, spawnImpl = spawn } = opcoes;
  if (!processo?.pid) return false;
  return ehWindows(plataforma) ? matarArvoreWindows(processo, spawnImpl) : matarGrupoPosix(processo, sinal);
}
