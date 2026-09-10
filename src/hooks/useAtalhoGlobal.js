import { useEffect } from 'react';

// Atalho global de teclado. Fica em hook porque o atalho é do aplicativo inteiro, não de uma tela,
// e porque a regra de quando ele não deve disparar é a parte que precisa de teste.

const EDITAVEIS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

// Digitar num campo nunca dispara atalho: quem está escrevendo "i" quer a letra, não a gaveta.
export function estaDigitando(alvo) {
  if (!alvo) return false;
  if (alvo.isContentEditable) return true;
  return EDITAVEIS.has(alvo.tagName);
}

// `Ctrl` no Windows e Linux, `Cmd` no macOS. Nunca os dois, e nunca com Alt junto, para não
// capturar combinação que o sistema já usa.
export function combinaComAtalho(evento, tecla) {
  if (evento.key?.toLowerCase() !== tecla) return false;
  if (evento.altKey || evento.shiftKey) return false;
  return evento.metaKey !== evento.ctrlKey;
}

export function useAtalhoGlobal(tecla, aoDisparar, { ativo = true, alvo = globalThis } = {}) {
  useEffect(() => {
    if (!ativo || !alvo?.addEventListener) return undefined;

    const aoTeclar = (evento) => {
      if (!combinaComAtalho(evento, tecla) || estaDigitando(evento.target)) return;
      evento.preventDefault();
      aoDisparar();
    };

    alvo.addEventListener('keydown', aoTeclar);
    return () => alvo.removeEventListener('keydown', aoTeclar);
  }, [tecla, aoDisparar, ativo, alvo]);
}
