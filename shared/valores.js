// Mapa de valores do gerador: toda chave que qualquer template usa tem um valor string, sempre.
// Resposta em branco vira um texto honesto e visível, nunca string vazia silenciosa.
export const A_DEFINIR = '_a definir_';

export const DESCRICAO_MODELO = Object.freeze({
  A: 'Modelo A, SPA com backend como serviço (Supabase direto do front, com RLS)',
  B: 'Modelo B, SPA com API própria (o backend é a única camada com acesso a disco, processos e segredos)',
  C: 'Modelo C, serviço sem interface, contrato-first',
});

const texto = (valor) => (typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : A_DEFINIR);
const simNao = (valor) => (valor ? 'Sim' : 'Não');

function lista(itens, vazio = A_DEFINIR) {
  const limpos = (itens ?? []).map((item) => String(item).trim()).filter((item) => item !== '');
  return limpos.length > 0 ? limpos.map((item) => `- ${item}`).join('\n') : vazio;
}

function linha(itens, vazio = A_DEFINIR) {
  const limpos = (itens ?? []).map((item) => String(item).trim()).filter((item) => item !== '');
  return limpos.length > 0 ? limpos.join(', ') : vazio;
}

function tabelaEntidades(entidades) {
  const validas = (entidades ?? []).filter((entidade) => String(entidade?.nome ?? '').trim() !== '');
  if (validas.length === 0) return `| ${A_DEFINIR} | | |`;
  return validas.map((entidade) => {
    const campos = (entidade.campos ?? []).filter((campo) => String(campo).trim() !== '');
    return `| \`${entidade.nome.trim()}\` | ${texto(entidade.descricao)} | ${campos.length > 0 ? campos.map((campo) => `\`${campo}\``).join(', ') : A_DEFINIR} |`;
  }).join('\n');
}

// A pasta da camada de dados depende do modelo, não de condicional dentro do template.
export function pastaDeDados(modelo) {
  return modelo === 'B' ? 'server' : 'supabase';
}

export function montarValores(contexto, { data, projeto, preset }) {
  const { identidade, escopo, arquitetura, dados, seguranca, fundacao } = contexto;
  return {
    PROJETO: projeto.nome,
    SLUG: projeto.slug,
    DATA: data,

    ESSENCIA: texto(identidade.essencia),
    PROBLEMA: texto(identidade.problema),
    VALOR: texto(identidade.valor),

    PUBLICO: texto(escopo.publico),
    AHA_MOMENT: texto(escopo.ahaMoment),
    PERSONAS: lista(escopo.personas),
    NAO_OBJETIVOS: lista(escopo.naoObjetivos),

    MODELO: arquitetura.modelo,
    MODELO_DESCRICAO: DESCRICAO_MODELO[arquitetura.modelo] ?? DESCRICAO_MODELO.A,
    STACK: lista(arquitetura.stack),
    STACK_LINHA: linha(arquitetura.stack),
    MULTI_TENANT: simNao(arquitetura.multiTenant),
    WHITE_LABEL: simNao(arquitetura.whiteLabel),
    AUTH: simNao(arquitetura.auth),
    DEPLOY: texto(arquitetura.deploy),
    PASTA_DADOS: pastaDeDados(arquitetura.modelo),

    ENTIDADES: tabelaEntidades(dados.entidades),

    DADO_PESSOAL: simNao(seguranca.dadoPessoal),
    DADO_FINANCEIRO: simNao(seguranca.dadoFinanceiro),
    COMPLIANCE: linha(seguranca.compliance, 'Nenhuma exigência registrada'),
    TIER_GRATUITO: simNao(seguranca.tierGratuito),
    OBSERVACOES_SEGURANCA: texto(seguranca.observacoes),
    OBSERVACOES_FUNDACAO: texto(fundacao.observacoes),

    PRESET_NOME: preset.nome,
    PRESET_ID: preset.id,
    PRESET_VERSAO: String(preset.versao),
    ETAPAS_ASSUMIDAS: linha(contexto.assumidas, 'Nenhuma. Todas as etapas foram respondidas'),
    TEM_UI: simNao(contexto.temUi),
  };
}

export const CHAVES_DE_VALOR = Object.freeze(Object.keys(montarValores(
  {
    identidade: {}, escopo: {}, arquitetura: { modelo: 'A' }, dados: {}, seguranca: {}, fundacao: {},
    assumidas: [], temUi: false,
  },
  { data: '2026-01-01', projeto: { nome: 'x', slug: 'x' }, preset: { id: 'x', nome: 'x', versao: 1 } },
)));
