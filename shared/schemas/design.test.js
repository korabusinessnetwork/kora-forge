import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  documentoDesignSchema, tokensSchema, noSchema, paginaSchema, listarTokens, aliasDePreview,
  TOKENS_PADRAO, TOKENS_DERIVADOS, PROFUNDIDADE_MAXIMA,
} from './design.js';

const TOKENS_CSS = fileURLToPath(new URL('../../templates/design-tokens/arquivos/src/styles/tokens.css', import.meta.url));

const pagina = (extra = {}) => ({ id: 'inicio', nome: 'Início', rota: '/', regioes: [], ...extra });
const no = (id, extra = {}) => ({ id, tipo: 'secao', props: {}, filhos: [], ...extra });
// Espelha o `formatarIssues` do servidor: campo desconhecido vira uma issue por campo, com o
// caminho completo. O `design.test.js` do módulo prova que a API responde assim de verdade.
const caminhos = (dados) => {
  const r = documentoDesignSchema.safeParse(dados);
  if (r.success) return [];
  return r.error.issues.flatMap((i) => (
    i.code === 'unrecognized_keys'
      ? i.keys.map((chave) => [...i.path, chave].join('.'))
      : [i.path.join('.')]
  ));
};
const mensagens = (dados) => {
  const r = documentoDesignSchema.safeParse(dados);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};

// Aninha `profundidade` níveis a partir da raiz, para exercitar o teto da árvore.
function empilhar(profundidade) {
  let atual = no(`n${profundidade}`);
  for (let nivel = profundidade - 1; nivel >= 1; nivel -= 1) {
    atual = no(`n${nivel}`, { filhos: [atual] });
  }
  return atual;
}

describe('documento de design, forma geral', () => {
  it('documento vazio é válido e vira defaults: o Studio salva enquanto a pessoa desenha', () => {
    const documento = documentoDesignSchema.parse({});
    expect(documento.paginas).toEqual([]);
    expect(documento.catalogo).toEqual({ versao: 1 });
    expect(documento.tokens.cor.fundo).toBe('#ffffff');
    expect(documento.tokens.espaco).toHaveLength(8);
    expect(documento.tokens.sombra).toHaveLength(2);
  });

  it('é estrito nas duas pontas: campo a mais é erro, não é ignorado em silêncio', () => {
    expect(caminhos({ inventado: true })).toContain('inventado');
    expect(caminhos({ paginas: [{ ...pagina(), extra: 1 }] })).toContain('paginas.0.extra');
    expect(caminhos({ tokens: { cor: { fundo: '#000', roxo: '#f0f' } } })).toContain('tokens.cor.roxo');
    expect(noSchema.safeParse({ ...no('a'), classe: 'x' }).success).toBe(false);
  });

  it('a hierarquia é árvore aninhada, sem campo de ordenação nem ponteiro para o pai', () => {
    const raiz = { ...pagina(), regioes: [no('topo', { filhos: [no('titulo')] })] };
    const documento = documentoDesignSchema.parse({ paginas: [raiz] });
    expect(documento.paginas[0].regioes[0].filhos[0].id).toBe('titulo');

    for (const campo of ['ordem', 'paiId', 'parentId', 'indice']) {
      const comCampo = { ...pagina(), regioes: [{ ...no('topo'), [campo]: 1 }] };
      expect(caminhos({ paginas: [comCampo] }), campo).toContain(`paginas.0.regioes.0.${campo}`);
    }
  });

  it('não aceita coordenada nenhuma: posição é a ordem do array, não um número (ADR-009)', () => {
    for (const campo of ['x', 'y', 'largura', 'topo']) {
      const comCoordenada = { ...pagina(), regioes: [{ ...no('topo'), [campo]: 10 }] };
      expect(caminhos({ paginas: [comCoordenada] }), campo).toContain(`paginas.0.regioes.0.${campo}`);
    }
  });

  it('a ordem dos irmãos é a ordem do array, e trocar a ordem muda o documento', () => {
    const comA = documentoDesignSchema.parse({ paginas: [{ ...pagina(), regioes: [no('a'), no('b')] }] });
    const comB = documentoDesignSchema.parse({ paginas: [{ ...pagina(), regioes: [no('b'), no('a')] }] });
    expect(comA.paginas[0].regioes.map((r) => r.id)).toEqual(['a', 'b']);
    expect(comB.paginas[0].regioes.map((r) => r.id)).toEqual(['b', 'a']);
  });
});

describe('limites da árvore', () => {
  it(`aceita ${PROFUNDIDADE_MAXIMA} níveis e recusa o seguinte com mensagem legível`, () => {
    const noLimite = { paginas: [{ ...pagina(), regioes: [empilhar(PROFUNDIDADE_MAXIMA)] }] };
    expect(documentoDesignSchema.safeParse(noLimite).success).toBe(true);

    const fundoDemais = { paginas: [{ ...pagina(), regioes: [empilhar(PROFUNDIDADE_MAXIMA + 1)] }] };
    const resultado = documentoDesignSchema.safeParse(fundoDemais);
    expect(resultado.success).toBe(false);
    expect(mensagens(fundoDemais).join(' ')).toMatch(new RegExp(`${PROFUNDIDADE_MAXIMA + 1} níveis`));
    expect(caminhos(fundoDemais)).toContain('paginas.0.regioes.0');
  });

  it('id repetido é recusado nomeando o id, em qualquer nível da árvore', () => {
    const doisIrmaos = { paginas: [{ ...pagina(), regioes: [no('bloco'), no('bloco')] }] };
    expect(mensagens(doisIrmaos).join(' ')).toContain('bloco');

    const paiEFilho = { paginas: [{ ...pagina(), regioes: [no('bloco', { filhos: [no('bloco')] })] }] };
    expect(mensagens(paiEFilho).join(' ')).toContain('bloco');

    const paginaEComponente = { paginas: [{ ...pagina({ id: 'inicio' }), regioes: [no('inicio')] }] };
    expect(mensagens(paginaEComponente).join(' ')).toContain('inicio');

    const outraPagina = { paginas: [pagina(), pagina({ rota: '/sobre' })] };
    expect(mensagens(outraPagina).join(' ')).toContain('inicio');
  });

  it('rota é validada e única: duas páginas na mesma rota é recusa', () => {
    const validas = ['/', '/painel', '/painel/config', '/relatorio-mensal'];
    for (const rota of validas) {
      expect(paginaSchema.safeParse(pagina({ rota })).success, rota).toBe(true);
    }
    const invalidas = ['painel', '/Painel', '/painel/', '/pai nel', '', '/painel?x=1'];
    for (const rota of invalidas) {
      expect(paginaSchema.safeParse(pagina({ rota })).success, rota).toBe(false);
    }
    const duplicada = { paginas: [pagina(), pagina({ id: 'home2' })] };
    expect(mensagens(duplicada).join(' ')).toContain('mesma rota');
  });

  it('página sem região é válida: é uma página em branco, não um erro', () => {
    expect(documentoDesignSchema.safeParse({ paginas: [pagina()] }).success).toBe(true);
  });

  it('prop é valor escalar, nunca objeto ou função serializada', () => {
    expect(noSchema.safeParse(no('a', { props: { titulo: 'Olá', colunas: 3, fixo: true } })).success).toBe(true);
    expect(noSchema.safeParse(no('a', { props: { onClick: { chamar: 'x' } } })).success).toBe(false);
    expect(noSchema.safeParse(no('a', { props: { 'Titulo Maiusculo': 'x' } })).success).toBe(false);
  });
});

describe('vocabulário dos tokens', () => {
  const css = fs.readFileSync(TOKENS_CSS, 'utf8');
  const declaradasNoCss = new Set([...css.matchAll(/^\s*(--[a-z0-9-]+):/gm)].map((m) => m[1]));
  const doSchema = new Set(listarTokens().map((t) => t.variavel));

  it('o template tem tokens para conferir', () => {
    expect(declaradasNoCss.size).toBeGreaterThan(30);
  });

  it('todo token do schema existe no tokens.css do template', () => {
    const faltando = [...doSchema].filter((variavel) => !declaradasNoCss.has(variavel));
    expect(faltando).toEqual([]);
  });

  it('toda variável do tokens.css existe no schema, fora as derivadas da allow-list', () => {
    const derivadas = new Set(TOKENS_DERIVADOS);
    const semToken = [...declaradasNoCss].filter((v) => !doSchema.has(v) && !derivadas.has(v));
    expect(semToken).toEqual([]);
  });

  it('a allow-list de derivadas é decisão explícita, e o que está nela é composto de outros', () => {
    expect(TOKENS_DERIVADOS).toEqual(['--anel-foco']);
    for (const variavel of TOKENS_DERIVADOS) {
      const linha = css.split('\n').find((l) => l.trim().startsWith(`${variavel}:`));
      expect(linha, variavel).toMatch(/var\(--/);
    }
  });

  it('a tabela de mapeamento traduz caminho do documento para variável do arquivo gerado', () => {
    const porCaminho = new Map(listarTokens().map((t) => [t.caminho, t]));
    expect(porCaminho.get('cor.fundo').variavel).toBe('--cor-fundo');
    expect(porCaminho.get('cor.textoSecundario').variavel).toBe('--cor-texto-secundario');
    expect(porCaminho.get('espaco[0]').variavel).toBe('--espaco-1');
    expect(porCaminho.get('espaco[7]').variavel).toBe('--espaco-8');
    expect(porCaminho.get('sombra[1]').variavel).toBe('--sombra-2');
    expect(porCaminho.get('fonte.ui').variavel).toBe('--fonte-ui');
    expect(porCaminho.get('motion.rapido').variavel).toBe('--motion-rapido');
    expect(porCaminho.get('corEscuro.fundo')).toMatchObject({ variavel: '--cor-fundo', escuro: true });
  });

  it('o valor padrão de cada token é o mesmo que está no template hoje', () => {
    for (const { variavel, valor, escuro } of listarTokens()) {
      if (escuro) continue;
      expect(css, variavel).toContain(`${variavel}: ${valor};`);
    }
  });

  it('o bloco de tema escuro do template tem os mesmos valores do grupo corEscuro', () => {
    const escuro = css.slice(css.indexOf('prefers-color-scheme: dark'));
    for (const { variavel, valor } of listarTokens().filter((t) => t.escuro)) {
      expect(escuro, variavel).toContain(`${variavel}: ${valor};`);
    }
  });

  it('o alias de preview é mecânico: prefixa --projeto no nome do arquivo gerado', () => {
    expect(aliasDePreview('--cor-fundo')).toBe('--projeto-cor-fundo');
    expect(aliasDePreview('--espaco-1')).toBe('--projeto-espaco-1');
    for (const { variavel, alias } of listarTokens()) {
      expect(alias, variavel).toBe(`--projeto${variavel.slice(1)}`);
      expect(alias.startsWith('--projeto-'), variavel).toBe(true);
    }
  });

  it('nenhum alias de preview colide com o namespace da ferramenta (P-06)', () => {
    for (const { alias } of listarTokens()) expect(alias.startsWith('--forge-')).toBe(false);
  });

  it('escala é lista de tamanho fixo: não dá para deixar buraco na escala', () => {
    expect(tokensSchema.safeParse({ espaco: ['1px'] }).success).toBe(false);
    expect(tokensSchema.safeParse({ espaco: [...TOKENS_PADRAO.espaco, '96px'] }).success).toBe(false);
    expect(tokensSchema.safeParse({ espaco: TOKENS_PADRAO.espaco.map(() => '') }).success).toBe(false);
  });

  it('token com valor em branco é recusado, senão o CSS gerado sai quebrado', () => {
    expect(tokensSchema.safeParse({ cor: { fundo: '   ' } }).success).toBe(false);
  });
});
