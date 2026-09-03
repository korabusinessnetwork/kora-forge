import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { regraSchema } from './schemas/regra.js';
import { avaliarCondicao } from './avaliador.js';

// Regra sem teste não entra no catálogo (ADR-004). Cada regra tem um contexto que dispara e um
// que não dispara, e o teste falha se o catálogo ganhar uma regra sem esse par.
const PASTA = fileURLToPath(new URL('../regras/', import.meta.url));

const regras = fs.readdirSync(PASTA).filter((n) => n.endsWith('.json'))
  .map((arquivo) => ({ arquivo, dados: JSON.parse(fs.readFileSync(path.join(PASTA, arquivo), 'utf8')) }));

function mesclar(base, sobrepor) {
  const saida = { ...base };
  for (const [chave, valor] of Object.entries(sobrepor)) {
    saida[chave] = valor && typeof valor === 'object' && !Array.isArray(valor) ? mesclar(base[chave] ?? {}, valor) : valor;
  }
  return saida;
}

const BASE = Object.freeze({
  preset: { id: 'criar-aplicacao-web', categoria: 'aplicacao', etapas: ['identidade', 'arquitetura', 'materializar'], versao: 1 },
  projeto: { status: 'rascunho', slug: 'alfa', materializado: false },
  identidade: { nome: 'Alfa', essencia: 'uma frase', problema: 'um problema', valor: 'um valor' },
  escopo: { publico: '', personas: [], ahaMoment: '', naoObjetivos: [] },
  arquitetura: { modelo: 'A', stack: ['react'], multiTenant: true, whiteLabel: true, auth: false, deploy: 'vercel' },
  dados: { entidades: [] },
  seguranca: { dadoPessoal: false, dadoFinanceiro: false, compliance: [], tierGratuito: true, observacoes: '' },
  fundacao: { observacoes: '' },
  materializar: { confirmada: false },
  etapasConcluidas: [],
  assumidas: [],
  temUi: false,
  integracoes: [],
  ferramentasAusentes: [],
});

const ctx = (sobrepor = {}) => mesclar(BASE, sobrepor);
const COM_DESIGN = { temUi: true, preset: { etapas: ['identidade', 'design', 'materializar'] } };

// [dispara, não dispara]
const CASOS = {
  'arq-multitenant-obrigatorio': [ctx({ arquitetura: { multiTenant: false } }), ctx()],
  'seg-rls-obrigatorio': [ctx({ arquitetura: { stack: ['react', 'supabase'] } }), ctx()],
  'seg-service-role-no-front': [ctx({ arquitetura: { stack: ['supabase', 'service_role'] } }), ctx({ arquitetura: { stack: ['supabase'] } })],
  'seg-pagamento-exige-edge-function': [ctx({ seguranca: { dadoFinanceiro: true } }), ctx()],
  'seg-dado-pessoal-lgpd': [ctx({ seguranca: { dadoPessoal: true } }), ctx()],
  'arq-auth-exige-rota-protegida': [ctx({ arquitetura: { auth: true } }), ctx()],
  'custo-servico-pago': [ctx({ seguranca: { tierGratuito: false } }), ctx()],
  'ux-tem-ui-exige-design-system': [ctx(COM_DESIGN), ctx({ ...COM_DESIGN, assumidas: ['design'] })],
  'qa-funcao-pura-com-teste': [ctx(), {}],
  'doc-fundacao-obrigatoria': [ctx(), {}],
  'arq-offline-first': [ctx({ arquitetura: { modelo: 'B' } }), ctx()],
  'seg-runner-ferramenta-ausente': [ctx({ ferramentasAusentes: ['supabase'] }), ctx()],
  'seo-meta-obrigatorio': [ctx({ preset: { categoria: 'site' }, identidade: { essencia: '' } }), ctx({ preset: { categoria: 'site' } })],
  'seg-bind-localhost': [ctx({ arquitetura: { modelo: 'B' } }), ctx()],
  'seg-token-sessao-local': [ctx({ arquitetura: { modelo: 'B' } }), ctx()],
  'seg-whitelist-comandos': [ctx({ arquitetura: { modelo: 'B' } }), ctx()],
};

describe('catálogo de regras', () => {
  it('tem os 16 ids do catálogo documentado e um arquivo por regra', () => {
    expect(regras).toHaveLength(16);
    expect(regras.map((r) => r.dados.id).sort()).toEqual(Object.keys(CASOS).sort());
    for (const { arquivo, dados } of regras) expect(arquivo).toBe(`${dados.id}.json`);
  });

  it('toda regra passa no contrato', () => {
    for (const { arquivo, dados } of regras) {
      const resultado = regraSchema.safeParse(dados);
      expect(resultado.success, `${arquivo}: ${JSON.stringify(resultado.error?.issues)}`).toBe(true);
    }
  });

  it('resolução automática nunca é dispensável, e bloquear exige severidade bloqueio', () => {
    for (const { dados } of regras) {
      if (dados.resolucao === 'automatica') expect(dados.dispensavel, dados.id).toBe(false);
      if (dados.efeitos.some((e) => e.tipo === 'bloquear')) expect(dados.severidade, dados.id).toBe('bloqueio');
    }
  });

  it('toda regra do catálogo tem um par de contextos de teste', () => {
    for (const { dados } of regras) expect(CASOS[dados.id], `regra sem teste: ${dados.id}`).toBeDefined();
  });
});

describe.each(regras.map(({ dados }) => [dados.id, dados]))('regra %s', (id, regra) => {
  it('dispara no contexto que a justifica', () => {
    expect(avaliarCondicao(regra.quando, CASOS[id][0])).toBe(true);
  });

  it('não dispara no contexto em que o problema não existe', () => {
    expect(avaliarCondicao(regra.quando, CASOS[id][1])).toBe(false);
  });
});
