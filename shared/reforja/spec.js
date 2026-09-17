import { gerarSlug } from '../slug.js';
import { renderizar } from '../template.js';

// Spec de melhoria gerada pela Auto-Reforja (ADR-014). Puro: o template chega carregado, a data é a
// de criação do item e não a do relógio, e por isso a prévia e a gravação produzem o mesmo texto.
export const PASTA_SPECS = 'specs';
export const PREFIXO_SPEC = 'reforja-';

export function slugDoItem(item) {
  const slug = gerarSlug(item.titulo);
  return slug === '' ? `item-${String(item.id).replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase()}` : slug;
}

// Relativo à raiz do Forge, com barra normal. Quem escreve ainda valida contra a raiz.
export function caminhoDaSpec(item) {
  return `${PASTA_SPECS}/${PREFIXO_SPEC}${slugDoItem(item)}.md`;
}

export function valoresDaSpec(item, template) {
  const { vazios, origens, prioridades } = template.manifesto;
  const descricao = typeof item.descricao === 'string' && item.descricao.trim() !== '' ? item.descricao.trim() : vazios.descricao;
  return {
    TITULO: item.titulo,
    ITEM_ID: item.id,
    ORIGEM: origens[item.origem] ?? item.origem,
    PRIORIDADE: prioridades[item.prioridade] ?? item.prioridade,
    SINAL: item.sinal ?? vazios.sinal,
    DATA: String(item.criadoEm).slice(0, 10),
    CAMINHO: caminhoDaSpec(item),
    DESCRICAO: descricao,
    VERSAO_TEMPLATE: template.manifesto.versao,
    A_DEFINIR: vazios.aDefinir,
  };
}

export function montarSpec(item, template) {
  return renderizar(template.texto, valoresDaSpec(item, template), `${template.manifesto.id}/spec.md`);
}
