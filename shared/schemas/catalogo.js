import { z } from 'zod';
import { slugSchema } from './preset.js';
import { CATALOGO_VERSAO_ATUAL, PROFUNDIDADE_MAXIMA } from './design.js';

// Catálogo de regiões e componentes (ADR-009, decisões 3 e 4). É o vocabulário do Studio: o
// documento de design só pode usar o que está aqui, e cada item declara o fragmento que gera o
// código dele. Sem essa amarração, o Studio deixaria desenhar o que o gerador não sabe escrever.
//
// Item é dado declarativo versionado, no mesmo padrão de preset, regra e template (P-01). Mora em
// `catalogo/<id>/`, não no banco: ninguém escreve nele, nada o referencia por chave estrangeira, e
// cópia no SQLite seria só uma segunda versão para ficar velha.

// Chave reservada do fragmento: onde entram os filhos do nó. Não é prop, e por isso não pode
// colidir com o id de uma prop.
export const CHAVE_FILHOS = 'FILHOS';

// `{{CHAVE}}` do motor é maiúscula. O id da prop é slug, então a tradução é mecânica e não
// precisa de segunda tabela: `texto-alternativo` vira `TEXTO_ALTERNATIVO`.
export function chaveDaProp(id) {
  return String(id).replace(/-/g, '_').toUpperCase();
}

export const PAPEIS = Object.freeze(['regiao', 'componente']);
export const TIPOS_DE_PROP = Object.freeze(['texto', 'numero', 'booleano', 'opcao']);

const microtexto = z.string().trim().min(1).max(200);

// Toda prop tem padrão, sem exceção: pergunta sem default é carga mental que o sistema já podia
// ter tirado (princípio nº 1). `obrigatoria` diz se o documento precisa trazer a prop, não se ela
// tem valor: valor sempre existe, nem que seja o do catálogo.
export const propCatalogoSchema = z.strictObject({
  id: slugSchema,
  tipo: z.enum(TIPOS_DE_PROP),
  rotulo: z.string().trim().min(1).max(60),
  microtexto,
  padrao: z.union([z.string(), z.number(), z.boolean()]),
  obrigatoria: z.boolean().default(false),
  opcoes: z.array(z.string().trim().min(1)).min(2).optional(),
}).superRefine((prop, ctx) => {
  const erro = (mensagem, campo) => ctx.addIssue({ code: 'custom', path: [campo], message: mensagem });

  if (prop.tipo === 'opcao') {
    if (!prop.opcoes) return erro('prop de tipo opcao precisa declarar opcoes.', 'opcoes');
    if (new Set(prop.opcoes).size !== prop.opcoes.length) erro('opção repetida.', 'opcoes');
    if (!prop.opcoes.includes(prop.padrao)) erro(`o padrão "${prop.padrao}" não está entre as opções.`, 'padrao');
    return;
  }
  if (prop.opcoes) erro(`opcoes só vale para prop de tipo opcao, e esta é ${prop.tipo}.`, 'opcoes');

  const esperado = { texto: 'string', numero: 'number', booleano: 'boolean' }[prop.tipo];
  if (typeof prop.padrao !== esperado) {
    erro(`o padrão de uma prop ${prop.tipo} tem que ser ${esperado}, e veio ${typeof prop.padrao}.`, 'padrao');
  }
});

export const itemCatalogoSchema = z.strictObject({
  id: slugSchema,
  versao: z.number().int().min(1),
  papel: z.enum(PAPEIS),
  nome: z.string().trim().min(1).max(60),
  descricao: z.string().trim().min(1).max(300),
  // O que este item afeta no resultado, em linguagem humana. Regra 3 do design system: a paleta
  // do canvas (bloco 4) mostra este texto, e sem ele o item vira nome solto na tela.
  microtexto,
  props: z.array(propCatalogoSchema).default([]),
  // Ids que podem ser filhos deste item. Lista vazia é folha.
  aceita: z.array(slugSchema).default([]),
}).superRefine((item, ctx) => {
  const ids = item.props.map((prop) => prop.id);
  const repetidas = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (repetidas.length > 0) {
    ctx.addIssue({ code: 'custom', path: ['props'], message: `prop repetida: ${[...new Set(repetidas)].join(', ')}` });
  }
  const colide = ids.find((id) => chaveDaProp(id) === CHAVE_FILHOS);
  if (colide) {
    ctx.addIssue({ code: 'custom', path: ['props'], message: `a prop "${colide}" colide com a chave reservada {{${CHAVE_FILHOS}}}.` });
  }
  const aceitaRepetido = item.aceita.filter((id, i) => item.aceita.indexOf(id) !== i);
  if (aceitaRepetido.length > 0) {
    ctx.addIssue({ code: 'custom', path: ['aceita'], message: `item repetido em aceita: ${[...new Set(aceitaRepetido)].join(', ')}` });
  }
  if (item.aceita.includes(item.id)) {
    ctx.addIssue({ code: 'custom', path: ['aceita'], message: 'um item não pode aceitar a si mesmo como filho.' });
  }
});

export const catalogoSchema = z.strictObject({
  versao: z.number().int().min(1),
  itens: z.array(itemCatalogoSchema),
});

export const CATALOGO_VERSAO = CATALOGO_VERSAO_ATUAL;

// ---------------------------------------------------------------------------
// Validação do documento de design contra o catálogo.
//
// O bloco 1 já garante a forma do documento: id único, rota válida, profundidade no teto. O que
// ele não podia garantir é o vocabulário, porque o catálogo não existia. É isto aqui.
// ---------------------------------------------------------------------------

const CAMINHO_RAIZ = 'paginas';

function tipoDoValor(valor) {
  if (typeof valor === 'number') return 'numero';
  if (typeof valor === 'boolean') return 'booleano';
  return 'texto';
}

// Devolve a lista de issues no mesmo formato de `formatarIssues`, para a rota poder recusar com o
// caminho apontando o nó, e não o documento inteiro.
export function conferirDocumento(documento, itens) {
  const porId = itens instanceof Map ? itens : new Map(itens.map((item) => [item.id, item]));
  const issues = [];
  const anotar = (caminho, mensagem) => issues.push({ caminho, mensagem });

  const conferirProps = (no, item, caminho) => {
    const declaradas = new Map(item.props.map((prop) => [prop.id, prop]));
    for (const [chave, valor] of Object.entries(no.props ?? {})) {
      const prop = declaradas.get(chave);
      if (!prop) {
        anotar(`${caminho}.props.${chave}`, `"${item.nome}" não tem a propriedade "${chave}". Aceita: ${[...declaradas.keys()].join(', ') || 'nenhuma'}.`);
        continue;
      }
      if (prop.tipo === 'opcao') {
        if (!prop.opcoes.includes(valor)) {
          anotar(`${caminho}.props.${chave}`, `"${valor}" não é uma opção de "${prop.rotulo}". Aceita: ${prop.opcoes.join(', ')}.`);
        }
        continue;
      }
      if (tipoDoValor(valor) !== prop.tipo) {
        anotar(`${caminho}.props.${chave}`, `"${prop.rotulo}" espera ${prop.tipo} e recebeu ${tipoDoValor(valor)}.`);
      }
    }
    // Prop opcional ausente não é erro: vale o padrão do catálogo, que sempre existe.
    for (const prop of item.props) {
      if (prop.obrigatoria && !Object.hasOwn(no.props ?? {}, prop.id)) {
        anotar(`${caminho}.props.${prop.id}`, `"${prop.rotulo}" é obrigatória em "${item.nome}".`);
      }
    }
  };

  const conferirNo = (no, caminho, pai) => {
    const item = porId.get(no.tipo);
    if (!item) {
      anotar(`${caminho}.tipo`, `"${no.tipo}" não existe no catálogo deste Forge.`);
      return;
    }
    if (pai === null) {
      if (item.papel !== 'regiao') {
        anotar(`${caminho}.tipo`, `"${item.nome}" é componente e só entra dentro de uma região. No topo da página vai região.`);
      }
    } else {
      if (item.papel === 'regiao') {
        anotar(`${caminho}.tipo`, `"${item.nome}" é região e só entra no topo da página, não dentro de "${pai.nome}".`);
      } else if (!pai.aceita.includes(item.id)) {
        anotar(`${caminho}.tipo`, `"${pai.nome}" não aceita "${item.nome}". Aceita: ${pai.aceita.join(', ') || 'nenhum item'}.`);
      }
    }
    conferirProps(no, item, caminho);
    (no.filhos ?? []).forEach((filho, i) => conferirNo(filho, `${caminho}.filhos.${i}`, item));
  };

  (documento.paginas ?? []).forEach((pagina, indice) => {
    (pagina.regioes ?? []).forEach((regiao, posicao) => {
      conferirNo(regiao, `${CAMINHO_RAIZ}.${indice}.regioes.${posicao}`, null);
    });
  });

  return issues;
}

// Item que saiu do catálogo não corrompe documento antigo (ADR-009, decisão 4). Na leitura vira
// pendência com nome, id do nó e a versão de catálogo que o documento declarou. Nada é reescrito.
export const pendenciaCatalogoSchema = z.strictObject({
  no: slugSchema,
  tipo: slugSchema,
  pagina: slugSchema,
  catalogoDoDocumento: z.number().int().min(1),
  catalogoDoForge: z.number().int().min(1),
});

export function listarPendencias(documento, itens, versaoDoForge = CATALOGO_VERSAO) {
  const conhecidos = new Set((itens instanceof Map ? [...itens.keys()] : itens.map((item) => item.id)));
  const pendencias = [];
  const visitar = (no, pagina) => {
    if (!conhecidos.has(no.tipo)) {
      pendencias.push({
        no: no.id,
        tipo: no.tipo,
        pagina: pagina.id,
        catalogoDoDocumento: documento.catalogo?.versao ?? versaoDoForge,
        catalogoDoForge: versaoDoForge,
      });
    }
    for (const filho of no.filhos ?? []) visitar(filho, pagina);
  };
  for (const pagina of documento.paginas ?? []) {
    for (const regiao of pagina.regioes ?? []) visitar(regiao, pagina);
  }
  return pendencias;
}

// O teto de profundidade do bloco 1 continua valendo, e `aceita` é um segundo limite, por item e
// mais apertado. Reexportado aqui para quem lê o catálogo não precisar caçar nos dois arquivos.
export { PROFUNDIDADE_MAXIMA };
