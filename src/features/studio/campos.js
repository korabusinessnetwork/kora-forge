import { listarTokens, TOKENS_PADRAO } from '@shared/schemas/design.js';
import { mensagens } from '../../mensagens.js';

// Os campos do painel são derivados de `listarTokens()`, e não escritos à mão. Assim token novo no
// schema aparece no painel sozinho, e o teste que compara as duas listas transforma "esqueci de
// adicionar o campo" em suíte vermelha, em vez de token que ninguém consegue editar.

const m = mensagens.studio.tokens;

// Grupo é a primeira parte do caminho: `cor.fundo` está em `cor`, `espaco[0]` está em `espaco`.
export function grupoDe(caminho) {
  return caminho.split(/[.[]/)[0];
}

export const ORDEM_DOS_GRUPOS = Object.freeze(['cor', 'corEscuro', 'fonte', 'texto', 'altura', 'espaco', 'raio', 'sombra', 'motion']);

// Só cor tem seletor nativo. O resto é texto, porque `12px` e `200ms ease-out` não cabem em
// nenhum controle especializado sem inventar formato.
const GRUPOS_DE_COR = new Set(['cor', 'corEscuro']);

// Lê `cor.fundo` ou `espaco[0]` dentro do objeto de tokens.
export function lerToken(tokens, caminho) {
  const [grupo, resto] = caminho.split(/[.[]/);
  if (caminho.includes('[')) return tokens[grupo]?.[Number(resto.replace(']', ''))];
  return tokens[grupo]?.[resto];
}

// Devolve uma cópia com o token trocado. Nunca muta o objeto que veio da API.
export function trocarToken(tokens, caminho, valor) {
  const [grupo, resto] = caminho.split(/[.[]/);
  if (caminho.includes('[')) {
    const indice = Number(resto.replace(']', ''));
    return { ...tokens, [grupo]: tokens[grupo].map((atual, i) => (i === indice ? valor : atual)) };
  }
  return { ...tokens, [grupo]: { ...tokens[grupo], [resto]: valor } };
}

export function restaurarGrupo(tokens, grupo) {
  const padrao = TOKENS_PADRAO[grupo];
  return { ...tokens, [grupo]: Array.isArray(padrao) ? [...padrao] : { ...padrao } };
}

// O rótulo de um token de escala é o nome do token gerado (`--espaco-1`), senão vira adivinhação:
// "espaço 3" não diz nada, `--espaco-3` é exatamente o que a pessoa vai escrever no CSS depois.
function rotuloDe(entrada) {
  const chave = entrada.caminho.split('.')[1];
  return m.rotulos[entrada.caminho] ?? m.rotulos[`${grupoDe(entrada.caminho)}.${chave}`] ?? entrada.variavel;
}

export function listarCampos(tokens = TOKENS_PADRAO) {
  return listarTokens(tokens).map((entrada) => ({
    caminho: entrada.caminho,
    grupo: grupoDe(entrada.caminho),
    variavel: entrada.variavel,
    alias: entrada.alias,
    tipo: GRUPOS_DE_COR.has(grupoDe(entrada.caminho)) ? 'cor' : 'texto',
    valor: entrada.valor,
    escuro: entrada.escuro === true,
    rotulo: rotuloDe(entrada),
    padrao: lerToken(TOKENS_PADRAO, entrada.caminho),
    id: `token-${entrada.caminho.replace(/[.[\]]/g, '-').replace(/-$/, '')}`,
  }));
}

export function listarGrupos(tokens = TOKENS_PADRAO) {
  const campos = listarCampos(tokens);
  return ORDEM_DOS_GRUPOS.map((grupo) => ({
    grupo,
    titulo: m.grupos[grupo].titulo,
    micro: m.grupos[grupo].micro,
    campos: campos.filter((campo) => campo.grupo === grupo),
  }));
}

// O seletor nativo só entende `#rrggbb`. Cor em `rgb()` ou `oklch()` continua válida no documento,
// e o campo de texto é quem manda: o seletor só mostra o que conseguir.
export function corParaSeletor(valor) {
  return /^#[0-9a-fA-F]{6}$/.test(String(valor).trim()) ? String(valor).trim().toLowerCase() : '#000000';
}

export function seletorRepresenta(valor) {
  return /^#[0-9a-fA-F]{6}$/.test(String(valor).trim());
}

// As custom properties que o preview aplica no próprio elemento. Único ponto do produto que monta
// estilo em tempo de execução, porque valor de token é dado e não cabe em arquivo estático.
export function variaveisDoPreview(tokens) {
  const estilo = {};
  for (const entrada of listarTokens(tokens)) {
    if (entrada.escuro) continue;
    estilo[entrada.alias] = entrada.valor;
  }
  return estilo;
}
