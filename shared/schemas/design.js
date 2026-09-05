import { z } from 'zod';
import { slugSchema } from './preset.js';

// Documento de design (ADR-009). É dado declarativo, nunca código: árvore aninhada, sem
// coordenada, sem campo de ordenação. A ordem dos irmãos é a ordem do array, e é essa a única
// ordenação possível, porque duas fontes de verdade para a mesma coisa quebram o determinismo.
//
// O vocabulário dos tokens é o do arquivo que o gerador escreve (`--cor-fundo`, `--espaco-1`),
// e não o `--projeto-*` do preview. O preview é apelido dentro do Forge; o canônico é o que sai
// no disco, senão o Studio edita uma coisa e o projeto nasce com outra.

// Teto de profundidade da árvore. Documento sem teto é caminho para estouro de pilha na
// renderização e no gerador, e o erro que aparece nesse caso não diz nada a ninguém.
export const PROFUNDIDADE_MAXIMA = 6;

const texto = (padrao) => z.string().trim().min(1).default(padrao);

// Tokens editáveis. `--anel-foco` fica de fora de propósito: é composto de outros dois tokens,
// então editá-lo direto seria abrir espaço para o arquivo gerado ficar internamente incoerente.
export const TOKENS_DERIVADOS = Object.freeze(['--anel-foco']);

export const tokensCorSchema = z.strictObject({
  fundo: texto('#ffffff'),
  superficie: texto('#f7f7f8'),
  borda: texto('#e3e3e7'),
  texto: texto('#17171a'),
  textoSecundario: texto('#6b6b76'),
  acento: texto('#2f6fed'),
  sucesso: texto('#1f8a5b'),
  aviso: texto('#b8860b'),
  perigo: texto('#c8372d'),
});

// O `tokens.css` gerado tem um bloco `prefers-color-scheme: dark` que sobrescreve cinco cores.
// Sem elas aqui, o Studio controlaria só metade da paleta que o projeto realmente usa.
export const tokensCorEscuroSchema = z.strictObject({
  fundo: texto('#0e0f12'),
  superficie: texto('#16181d'),
  borda: texto('#282c34'),
  texto: texto('#e8eaed'),
  textoSecundario: texto('#9aa0a9'),
});

export const tokensFonteSchema = z.strictObject({
  ui: texto('Inter, system-ui, -apple-system, "Segoe UI", sans-serif'),
  mono: texto('ui-monospace, "JetBrains Mono", "Cascadia Code", monospace'),
});

export const tokensEscalaSchema = z.strictObject({
  xs: texto('12px'),
  sm: texto('13px'),
  md: texto('15px'),
  lg: texto('20px'),
  xl: texto('28px'),
});

export const tokensAlturaSchema = z.strictObject({
  xs: texto('16px'),
  sm: texto('20px'),
  md: texto('24px'),
  lg: texto('28px'),
  xl: texto('36px'),
});

export const tokensRaioSchema = z.strictObject({
  sm: texto('4px'),
  md: texto('8px'),
  lg: texto('14px'),
});

export const tokensMotionSchema = z.strictObject({
  rapido: texto('120ms ease-out'),
  base: texto('200ms ease-out'),
});

const ESPACO_PADRAO = Object.freeze(['4px', '8px', '12px', '16px', '24px', '32px', '48px', '64px']);
const SOMBRA_PADRAO = Object.freeze(['0 1px 2px rgba(0, 0, 0, 0.08)', '0 8px 24px rgba(0, 0, 0, 0.12)']);

// Escala vira lista, e não objeto de chaves numéricas: a posição no array **é** o número do
// token (`espaco[0]` é `--espaco-1`), então não existe jeito de a escala ficar com buraco.
const escala = (padrao) => z.array(z.string().trim().min(1)).length(padrao.length).default([...padrao]);

// `prefault` e não `default`: no Zod 4 o valor de `default` volta cru, sem passar pelo schema, e
// um grupo omitido viraria `{}` em vez de virar os defaults de dentro dele.
export const tokensSchema = z.strictObject({
  cor: tokensCorSchema.prefault({}),
  corEscuro: tokensCorEscuroSchema.prefault({}),
  fonte: tokensFonteSchema.prefault({}),
  texto: tokensEscalaSchema.prefault({}),
  altura: tokensAlturaSchema.prefault({}),
  espaco: escala(ESPACO_PADRAO),
  raio: tokensRaioSchema.prefault({}),
  sombra: escala(SOMBRA_PADRAO),
  motion: tokensMotionSchema.prefault({}),
});

export const TOKENS_PADRAO = Object.freeze(tokensSchema.parse({}));

// Alias do preview dentro do Forge. A regra é mecânica, e de propósito: prefixar `--projeto` no
// nome que o arquivo gerado usa. Uma segunda tabela de nomes seria uma segunda coisa para sair de
// sincronia, e o preview passaria a mentir sem ninguém perceber (P-06 e ADR-009).
export const aliasDePreview = (variavel) => `--projeto${variavel.slice(1)}`;

// Tabela explícita de tradução para as variáveis CSS do arquivo gerado. Explícita porque a
// ADR-009 exige que ela seja testada: token novo entra aqui e no template, ou o preview mente.
export function listarTokens(tokens = TOKENS_PADRAO) {
  const entradas = [];
  const registrar = (entrada) => entradas.push({ ...entrada, alias: aliasDePreview(entrada.variavel) });
  const simples = (grupo, prefixo) => {
    for (const [chave, valor] of Object.entries(tokens[grupo] ?? {})) {
      const sufixo = chave.replace(/[A-Z]/g, (letra) => `-${letra.toLowerCase()}`);
      registrar({ caminho: `${grupo}.${chave}`, variavel: `${prefixo}-${sufixo}`, valor });
    }
  };
  const lista = (grupo, prefixo) => {
    (tokens[grupo] ?? []).forEach((valor, indice) => {
      registrar({ caminho: `${grupo}[${indice}]`, variavel: `${prefixo}-${indice + 1}`, valor });
    });
  };

  simples('cor', '--cor');
  simples('fonte', '--fonte');
  simples('texto', '--texto');
  simples('altura', '--altura');
  simples('raio', '--raio');
  simples('motion', '--motion');
  lista('espaco', '--espaco');
  lista('sombra', '--sombra');
  // O tema escuro reusa os mesmos nomes, dentro do bloco de media query.
  for (const [chave, valor] of Object.entries(tokens.corEscuro ?? {})) {
    const sufixo = chave.replace(/[A-Z]/g, (letra) => `-${letra.toLowerCase()}`);
    registrar({ caminho: `corEscuro.${chave}`, variavel: `--cor-${sufixo}`, valor, escuro: true });
  }
  return entradas;
}

// Nó da árvore: uma região ou um componente. A diferença entre os dois é o que o catálogo diz
// que eles são (bloco 3), não o formato, então aqui os dois têm a mesma forma.
export const valorDePropSchema = z.union([z.string(), z.number(), z.boolean()]);

export const noSchema = z.lazy(() => z.strictObject({
  id: slugSchema,
  tipo: slugSchema,
  props: z.record(slugSchema, valorDePropSchema).default({}),
  filhos: z.array(noSchema).default([]),
}));

// Rota é o caminho da página no projeto gerado. Começa com barra, sem barra no fim, minúscula.
export const rotaSchema = z.string().regex(/^\/([a-z0-9]+(-[a-z0-9]+)*(\/[a-z0-9]+(-[a-z0-9]+)*)*)?$/, 'use um caminho como /, /painel ou /painel/config');

export const paginaSchema = z.strictObject({
  id: slugSchema,
  nome: z.string().trim().min(1).max(80),
  rota: rotaSchema,
  regioes: z.array(noSchema).default([]),
});

// Versão do catálogo que este Forge sabe ler. O catálogo em si chega no bloco 3; até lá o número
// existe para que documento vindo de um Forge mais novo seja recusado com nome e versão, em vez de
// abrir pela metade.
export const CATALOGO_VERSAO_ATUAL = 1;

export const catalogoRefSchema = z.strictObject({
  versao: z.number().int().min(1).default(CATALOGO_VERSAO_ATUAL),
});

function profundidadeDe(no, atual = 1) {
  const filhos = no.filhos ?? [];
  if (filhos.length === 0) return atual;
  return Math.max(...filhos.map((filho) => profundidadeDe(filho, atual + 1)));
}

function coletarIds(no, destino) {
  destino.push(no.id);
  for (const filho of no.filhos ?? []) coletarIds(filho, destino);
}

function repetidos(lista) {
  const vistos = new Set();
  const repetiu = new Set();
  for (const item of lista) {
    if (vistos.has(item)) repetiu.add(item);
    vistos.add(item);
  }
  return [...repetiu];
}

export const documentoDesignSchema = z.strictObject({
  catalogo: catalogoRefSchema.prefault({}),
  tokens: tokensSchema.prefault({}),
  paginas: z.array(paginaSchema).default([]),
}).superRefine((documento, ctx) => {
  const ids = [];
  const rotas = [];

  documento.paginas.forEach((pagina, indice) => {
    ids.push(pagina.id);
    rotas.push(pagina.rota);
    pagina.regioes.forEach((regiao, posicao) => {
      coletarIds(regiao, ids);
      const fundo = profundidadeDe(regiao);
      if (fundo > PROFUNDIDADE_MAXIMA) {
        ctx.addIssue({
          code: 'custom',
          path: ['paginas', indice, 'regioes', posicao],
          message: `a árvore desce ${fundo} níveis e o máximo é ${PROFUNDIDADE_MAXIMA}. Agrupe em menos camadas.`,
        });
      }
    });
  });

  // Id repetido quebra desfazer, seleção e diff de uma vez só, então é recusa e não aviso.
  const idsRepetidos = repetidos(ids);
  if (idsRepetidos.length > 0) {
    ctx.addIssue({ code: 'custom', path: ['paginas'], message: `id repetido no documento: ${idsRepetidos.join(', ')}` });
  }
  const rotasRepetidas = repetidos(rotas);
  if (rotasRepetidas.length > 0) {
    ctx.addIssue({ code: 'custom', path: ['paginas'], message: `duas páginas na mesma rota: ${rotasRepetidas.join(', ')}` });
  }
});

export const registroDesignSchema = z.strictObject({
  versao: z.number().int().min(1),
  ativo: z.boolean(),
  criadoEm: z.string().min(1),
  payload: documentoDesignSchema,
});

// Projeto sem documento de design é estado normal, e significa "usei o padrão Kora". Por isso a
// resposta é `null`, e não 404: ausência aqui não é erro.
export const designOuNadaSchema = z.strictObject({
  design: registroDesignSchema.nullable(),
});

export const versaoDesignSchema = z.strictObject({
  versao: z.number().int().min(1),
  ativo: z.boolean(),
  criadoEm: z.string().min(1),
});

export const listaVersoesDesignSchema = z.array(versaoDesignSchema);
