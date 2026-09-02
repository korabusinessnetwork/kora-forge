// Token de sessão local. Chega pelo fragmento da URL (#token=), vive em sessionStorage
// (por aba, some ao fechar) e nunca em localStorage de longa duração (docs/11, C2).
const CHAVE_TOKEN = 'forge.token';
const PADRAO_TOKEN = /^[A-Za-z0-9]+$/;
let tokenEmMemoria = null;

function armazenamento() {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

export function obterToken() {
  try {
    return armazenamento()?.getItem(CHAVE_TOKEN) ?? tokenEmMemoria;
  } catch {
    return tokenEmMemoria;
  }
}

export function limparToken() {
  tokenEmMemoria = null;
  try {
    armazenamento()?.removeItem(CHAVE_TOKEN);
  } catch {
    // sem armazenamento, nada a limpar
  }
}

// Lê #token=... do fragmento, guarda na sessão e tira da URL. O resto do hash é preservado.
export function capturarTokenDaUrl(local = globalThis.location, historico = globalThis.history) {
  const hash = typeof local?.hash === 'string' ? local.hash : '';
  if (!hash.startsWith('#')) return obterToken();
  const partes = hash.slice(1).split('&');
  const indice = partes.findIndex((parte) => parte.startsWith('token='));
  if (indice === -1) return obterToken();
  const token = partes[indice].slice('token='.length);
  if (!PADRAO_TOKEN.test(token)) return obterToken();

  tokenEmMemoria = token;
  try {
    armazenamento()?.setItem(CHAVE_TOKEN, token);
  } catch {
    // sem armazenamento, o token vale só nesta carga da página
  }

  const restante = partes.filter((_, i) => i !== indice).join('&');
  const url = `${local.pathname ?? '/'}${local.search ?? ''}${restante ? `#${restante}` : ''}`;
  try {
    historico?.replaceState?.(null, '', url);
  } catch {
    // sem history, a URL fica como está
  }
  return token;
}
