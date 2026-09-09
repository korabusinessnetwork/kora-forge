import { z } from 'zod';

// Catálogo de tokens do projeto (ADR-005, Fase 2 bloco 1).
//
// Token não é campo livre. Fechar o catálogo é o que permite validar o que chega da API, gerar o
// CSS sem condicional e o preview saber o que renderizar. Token novo entra aqui **e** no template
// `design-tokens` no mesmo commit; um sem o outro deixa placeholder sem valor ou valor sem uso.
//
// Os nomes são os que o template já gera, sem prefixo. O P-06 fala em `--projeto-*`, e a
// divergência está registrada na spec do bloco: renomear mudaria todo projeto já gerado, e a
// separação em relação ao `--forge-*` continua valendo do mesmo jeito.

export const GRUPOS = Object.freeze(['cor', 'escuro', 'tipografia', 'espacamento', 'forma', 'movimento']);
export const TIPOS = Object.freeze(['cor', 'medida', 'fonte', 'texto']);

// Hexadecimal de 3, 4, 6 ou 8 dígitos, ou função de cor do CSS. Nada de nome de cor solto: o
// catálogo existe para o valor ser inspecionável, e `rebeccapurple` não diz nada a um seletor.
const COR = /^(#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|(rgb|rgba|hsl|hsla|oklch|lab)\([^()]*\))$/;

// Número com unidade, ou zero puro. `16px`, `1.5rem`, `0`.
const MEDIDA = /^(0|-?\d+(\.\d+)?(px|rem|em|%|vh|vw|ch))$/;

const validador = {
  cor: (valor) => COR.test(valor),
  medida: (valor) => MEDIDA.test(valor),
  // Pilha de fontes é texto livre com vírgula e aspas, e o que a protege é o limite de tamanho.
  fonte: (valor) => valor.length > 0 && valor.length <= 200 && !/[{}<>;]/.test(valor),
  texto: (valor) => valor.length > 0 && valor.length <= 200 && !/[{}<>;]/.test(valor),
};

export const FORMATO_ESPERADO = Object.freeze({
  cor: 'uma cor, como #2f6fed ou rgb(47 111 237)',
  medida: 'um número com unidade, como 16px ou 1.5rem',
  fonte: 'uma pilha de fontes, como Inter, system-ui, sans-serif',
  texto: 'um texto curto, sem chaves, sinais de maior e menor, ou ponto e vírgula',
});

// `chave` é a chave de template, em maiúsculas. `css` é o nome da variável no arquivo gerado.
const t = (chave, css, grupo, tipo, padrao, rotulo) => ({ chave, css, grupo, tipo, padrao, rotulo });

export const CATALOGO_TOKENS = Object.freeze([
  t('COR_FUNDO', '--cor-fundo', 'cor', 'cor', '#ffffff', 'Fundo'),
  t('COR_SUPERFICIE', '--cor-superficie', 'cor', 'cor', '#f7f7f8', 'Superfície'),
  t('COR_BORDA', '--cor-borda', 'cor', 'cor', '#e3e3e7', 'Borda'),
  t('COR_TEXTO', '--cor-texto', 'cor', 'cor', '#17171a', 'Texto'),
  t('COR_TEXTO_SECUNDARIO', '--cor-texto-secundario', 'cor', 'cor', '#6b6b76', 'Texto secundário'),
  t('COR_ACENTO', '--cor-acento', 'cor', 'cor', '#2f6fed', 'Acento'),
  t('COR_SUCESSO', '--cor-sucesso', 'cor', 'cor', '#1f8a5b', 'Sucesso'),
  t('COR_AVISO', '--cor-aviso', 'cor', 'cor', '#b8860b', 'Aviso'),
  t('COR_PERIGO', '--cor-perigo', 'cor', 'cor', '#c8372d', 'Perigo'),

  t('FONTE_UI', '--fonte-ui', 'tipografia', 'fonte', 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif', 'Fonte da interface'),
  t('FONTE_MONO', '--fonte-mono', 'tipografia', 'fonte', 'ui-monospace, "JetBrains Mono", "Cascadia Code", monospace', 'Fonte monoespaçada'),
  t('TEXTO_XS', '--texto-xs', 'tipografia', 'medida', '12px', 'Texto miúdo'),
  t('ALTURA_XS', '--altura-xs', 'tipografia', 'medida', '16px', 'Entrelinha do miúdo'),
  t('TEXTO_SM', '--texto-sm', 'tipografia', 'medida', '13px', 'Texto pequeno'),
  t('ALTURA_SM', '--altura-sm', 'tipografia', 'medida', '20px', 'Entrelinha do pequeno'),
  t('TEXTO_MD', '--texto-md', 'tipografia', 'medida', '15px', 'Texto padrão'),
  t('ALTURA_MD', '--altura-md', 'tipografia', 'medida', '24px', 'Entrelinha do padrão'),
  t('TEXTO_LG', '--texto-lg', 'tipografia', 'medida', '20px', 'Título pequeno'),
  t('ALTURA_LG', '--altura-lg', 'tipografia', 'medida', '28px', 'Entrelinha do título pequeno'),
  t('TEXTO_XL', '--texto-xl', 'tipografia', 'medida', '28px', 'Título grande'),
  t('ALTURA_XL', '--altura-xl', 'tipografia', 'medida', '36px', 'Entrelinha do título grande'),

  t('ESPACO_1', '--espaco-1', 'espacamento', 'medida', '4px', 'Espaço 1'),
  t('ESPACO_2', '--espaco-2', 'espacamento', 'medida', '8px', 'Espaço 2'),
  t('ESPACO_3', '--espaco-3', 'espacamento', 'medida', '12px', 'Espaço 3'),
  t('ESPACO_4', '--espaco-4', 'espacamento', 'medida', '16px', 'Espaço 4'),
  t('ESPACO_5', '--espaco-5', 'espacamento', 'medida', '24px', 'Espaço 5'),
  t('ESPACO_6', '--espaco-6', 'espacamento', 'medida', '32px', 'Espaço 6'),
  t('ESPACO_7', '--espaco-7', 'espacamento', 'medida', '48px', 'Espaço 7'),
  t('ESPACO_8', '--espaco-8', 'espacamento', 'medida', '64px', 'Espaço 8'),

  t('RAIO_SM', '--raio-sm', 'forma', 'medida', '4px', 'Canto pequeno'),
  t('RAIO_MD', '--raio-md', 'forma', 'medida', '8px', 'Canto médio'),
  t('RAIO_LG', '--raio-lg', 'forma', 'medida', '14px', 'Canto grande'),
  t('SOMBRA_1', '--sombra-1', 'forma', 'texto', '0 1px 2px rgba(0, 0, 0, 0.08)', 'Sombra rente'),
  t('SOMBRA_2', '--sombra-2', 'forma', 'texto', '0 8px 24px rgba(0, 0, 0, 0.12)', 'Sombra elevada'),

  t('MOTION_RAPIDO', '--motion-rapido', 'movimento', 'texto', '120ms ease-out', 'Transição rápida'),
  t('MOTION_BASE', '--motion-base', 'movimento', 'texto', '200ms ease-out', 'Transição padrão'),

  // O projeto gerado nasce respondendo a `prefers-color-scheme`. Só as cores que mudam no escuro
  // entram aqui: o resto vale para os dois modos.
  t('ESCURO_COR_FUNDO', '--cor-fundo', 'escuro', 'cor', '#0e0f12', 'Fundo, no escuro'),
  t('ESCURO_COR_SUPERFICIE', '--cor-superficie', 'escuro', 'cor', '#16181d', 'Superfície, no escuro'),
  t('ESCURO_COR_BORDA', '--cor-borda', 'escuro', 'cor', '#282c34', 'Borda, no escuro'),
  t('ESCURO_COR_TEXTO', '--cor-texto', 'escuro', 'cor', '#e8eaed', 'Texto, no escuro'),
  t('ESCURO_COR_TEXTO_SECUNDARIO', '--cor-texto-secundario', 'escuro', 'cor', '#9aa0a9', 'Texto secundário, no escuro'),
]);

export const CHAVES_TOKENS = Object.freeze(CATALOGO_TOKENS.map((token) => token.chave));

export const TOKEN_POR_CHAVE = Object.freeze(Object.fromEntries(CATALOGO_TOKENS.map((token) => [token.chave, token])));

export const TOKENS_PADRAO = Object.freeze(Object.fromEntries(CATALOGO_TOKENS.map((token) => [token.chave, token.padrao])));

// Chave desconhecida é recusada, e valor fora do tipo diz qual formato se esperava. Toda chave é
// opcional na entrada: o que não vier cai para o default, que é o que mantém o documento válido
// quando o catálogo cresce.
export const tokensSchema = z.record(z.string(), z.string()).superRefine((valores, ctx) => {
  for (const [chave, valor] of Object.entries(valores)) {
    const token = TOKEN_POR_CHAVE[chave];
    if (!token) {
      ctx.addIssue({ code: 'custom', path: [chave], message: `Token desconhecido: ${chave}.` });
      continue;
    }
    if (!validador[token.tipo](valor)) {
      ctx.addIssue({ code: 'custom', path: [chave], message: `${token.rotulo} espera ${FORMATO_ESPERADO[token.tipo]}.` });
    }
  }
});

// O que falta cai para o default e o que sobra já foi recusado, então a saída é sempre completa.
export function completarTokens(parciais = {}) {
  return { ...TOKENS_PADRAO, ...parciais };
}

export const documentoDesignSchema = z.strictObject({
  // Zero é um estado legítimo e não um buraco: quer dizer que ninguém salvou nada ainda, e que os
  // tokens abaixo são os defaults do catálogo. A tela usa isso para saber se há o que restaurar.
  versao: z.number().int().nonnegative(),
  tokens: z.record(z.string(), z.string()),
  // Páginas chegam no bloco de layout, que exige ADR próprio. Aqui o campo existe e fica vazio,
  // para o contrato não mudar de forma quando ele chegar.
  paginas: z.array(z.unknown()),
  // Nulo enquanto a versão é zero, pelo mesmo motivo.
  criadoEm: z.string().min(1).nullable(),
});

export const salvarDesignSchema = z.strictObject({
  tokens: tokensSchema,
});
