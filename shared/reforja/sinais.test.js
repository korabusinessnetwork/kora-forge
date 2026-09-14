import { describe, it, expect } from 'vitest';
import { CATALOGO_SINAIS, LIMITE_EVIDENCIAS, LIMITE_LINHAS, calcularSinais, resumirSinais } from './sinais.js';

const arq = (caminho, conteudo) => ({ caminho, conteudo });
const sinal = (sinais, id) => sinais.find((s) => s.id === id);
const linhas = (n) => Array.from({ length: n }, (_, i) => `const v${i} = ${i};`).join('\n');
// Montado por partes para este arquivo de teste não carregar o marcador que ele mesmo procura.
const MARCA = ['TO', 'DO'].join('');
const MARCA_FIX = ['FIX', 'ME'].join('');
const MARCA_X = ['X', 'XX'].join('');
const LOG = ['console', 'log'].join('.');

describe('marcadores-pendentes', () => {
  it('conta marcador logo depois de abrir comentário, em código de produto', () => {
    const sinais = calcularSinais([
      arq('src/a.js', `// ${MARCA} arrumar\n/* ${MARCA_FIX}: quebrado */\n * ${MARCA_X} olhar\nconst x = 1;`),
      arq('server/b.js', `const nome = '${MARCA}'; // comentário comum`),
      arq('src/a.test.js', `// ${MARCA} no teste não conta`),
      arq('server/testes/apoio.js', `// ${MARCA} em apoio de teste não conta`),
      arq('docs/x.js', `// ${MARCA} fora de produto não conta`),
    ]);
    expect(sinal(sinais, 'marcadores-pendentes')).toMatchObject({ total: 1, ocorrencias: 3, evidencias: [{ arquivo: 'src/a.js', contagem: 3 }] });
  });
});

describe('console-log-em-produto', () => {
  it('conta a chamada e ignora comentário', () => {
    const sinais = calcularSinais([
      arq('src/c.jsx', `${LOG}('a');\n${LOG} ('b');\n// ${LOG}('comentado')\n/* ${LOG}('bloco') */\nlogger.${LOG.split('.')[1]}('não')`),
    ]);
    expect(sinal(sinais, 'console-log-em-produto').evidencias).toEqual([{ arquivo: 'src/c.jsx', contagem: 2 }]);
  });
});

describe('sem-teste-colocalizado', () => {
  it('acusa .js de server e shared sem teste irmão nem teste da pasta que importe o arquivo', () => {
    const sinais = calcularSinais([
      arq('server/m/servico.js', 'a\nb'),
      arq('server/m/servico.test.js', ''),
      arq('server/m/rotas.js', 'a\nb\nc'),
      arq('server/m/modulo.test.js', "import x from './util.js';"),
      arq('server/m/util.js', 'a'),
      arq('shared/solto.js', 'a'),
      arq('src/sem.js', 'a'),
      arq('server/m/Componente.jsx', 'a'),
    ]);
    expect(sinal(sinais, 'sem-teste-colocalizado').evidencias).toEqual([
      { arquivo: 'server/m/rotas.js', contagem: 3 },
      { arquivo: 'shared/solto.js', contagem: 1 },
    ]);
  });
});

describe('arquivos-grandes', () => {
  it('acusa acima do limite e aceita o limite exato', () => {
    const sinais = calcularSinais([
      arq('src/grande.jsx', linhas(LIMITE_LINHAS + 1)),
      arq('src/exato.jsx', linhas(LIMITE_LINHAS)),
      arq('src/grande.test.jsx', linhas(LIMITE_LINHAS + 50)),
    ]);
    expect(sinal(sinais, 'arquivos-grandes').evidencias).toEqual([{ arquivo: 'src/grande.jsx', contagem: LIMITE_LINHAS + 1 }]);
  });

  it('arquivo acima do limite de leitura entra só como grande, com contagem nula', () => {
    const sinais = calcularSinais([arq('src/enorme.js', null), arq('specs/enorme.md', null)]);
    expect(sinal(sinais, 'arquivos-grandes').evidencias).toEqual([{ arquivo: 'src/enorme.js', contagem: null }]);
    expect(sinal(sinais, 'specs-sem-auditoria')).toBeUndefined();
  });

  it('o limite é configurável', () => {
    expect(sinal(calcularSinais([arq('src/a.js', linhas(11))], { limiteLinhas: 10 }), 'arquivos-grandes').total).toBe(1);
  });
});

describe('specs', () => {
  const comAuditoria = (tabela) => `# Spec\n\n## 4. Critérios\n\n| # | Sim | Evidência |\n|---|---|---|\n| 1 | não | antes da auditoria não conta |\n\n## 7. Auditoria\r\n\r\n${tabela}\r\n\r\n## 8. Depois\n| # | Sim |\n|---|---|\n| 9 | não |`;

  it('spec sem seção de auditoria é acusada; _loop.md e subpasta não', () => {
    const sinais = calcularSinais([
      arq('specs/sem.md', '# Spec\n\n## 1. Escopo\n'),
      arq('specs/_loop.md', '# Ledger'),
      arq('specs/antigas/velha.md', '# nada'),
      arq('specs/review.md', '# x\n\n## 9. Review (2026-09-08)\n\ntexto'),
    ]);
    expect(sinal(sinais, 'specs-sem-auditoria').evidencias).toEqual([{ arquivo: 'specs/sem.md', contagem: 1 }]);
  });

  it('conta só linha numerada da seção de auditoria cuja coluna de aprovação não diz sim', () => {
    const tabela = [
      '| # | Critério | Sim? | Evidência |',
      '|---|---|---|---|',
      '| 1 | a | sim | ok |',
      '| 2 | b | **Sim** | ok |',
      '| 3 | c | não | falta |',
      '| 4 | d | parcial | meio |',
      '',
      '| # | Atende | Evidência |',
      '|---|---|---|',
      '| 5 | sim, com ressalva escrita | x |',
      '| 6 | ? | x |',
      '',
      '| # | Critério | Evidência |',
      '|---|---|---|',
      '| 7 | sem coluna de aprovação | não é lida |',
    ].join('\n');
    const sinais = calcularSinais([arq('specs/pendente.md', comAuditoria(tabela)), arq('specs/limpa.md', comAuditoria('| # | Atende |\n|---|---|\n| 1 | sim |'))]);
    expect(sinal(sinais, 'specs-com-criterio-pendente').evidencias).toEqual([{ arquivo: 'specs/pendente.md', contagem: 3 }]);
    expect(sinal(sinais, 'specs-sem-auditoria')).toBeUndefined();
  });
});

describe('backlog-nao-entregue', () => {
  it('conta linha de tabela Bloco e Estado que não diz entregue nem provado', () => {
    const texto = [
      '| Bloco | Estado | Spec |',
      '|---|---|---|',
      '| 1, x | **entregue** | a |',
      '| 2, y | próximo | |',
      '| 3, z | a fazer | |',
      '| aceite | provado em 2026 | b |',
      '',
      '| Fase | Entrega |',
      '|---|---|',
      '| 1 | não é tabela de bloco |',
    ].join('\n');
    const sinais = calcularSinais([arq('docs/09_BACKLOG/fase9.md', texto), arq('docs/outro/fase.md', texto)]);
    expect(sinal(sinais, 'backlog-nao-entregue').evidencias).toEqual([{ arquivo: 'docs/09_BACKLOG/fase9.md', contagem: 2 }]);
  });
});

describe('forma e ordem', () => {
  const fixture = () => [
    arq('src/b.js', `// ${MARCA}\n${LOG}(1)`),
    arq('src/a.js', `// ${MARCA}\n// ${MARCA}\n${LOG}(1)`),
    arq('specs/sem.md', '# s'),
    arq('specs/p.md', '## 7. Auditoria\n| # | Sim |\n|---|---|\n| 1 | não |'),
    arq('shared/x.js', 'a'),
  ];

  it('ordena por severidade e depois por id; evidência por contagem e depois por arquivo', () => {
    const sinais = calcularSinais(fixture());
    expect(sinais.map((s) => s.id)).toEqual(['specs-com-criterio-pendente', 'console-log-em-produto', 'marcadores-pendentes', 'specs-sem-auditoria', 'sem-teste-colocalizado']);
    expect(sinal(sinais, 'console-log-em-produto').evidencias.map((e) => e.arquivo)).toEqual(['src/a.js', 'src/b.js']);
    expect(sinal(sinais, 'marcadores-pendentes').evidencias.map((e) => e.arquivo)).toEqual(['src/a.js', 'src/b.js']);
  });

  it('não depende da ordem de entrada: mesma árvore, mesmo resultado', () => {
    expect(calcularSinais([...fixture()].reverse())).toEqual(calcularSinais(fixture()));
  });

  it('cada sinal traz o contrato completo, com texto do catálogo', () => {
    for (const s of calcularSinais(fixture())) {
      expect(Object.keys(s).sort()).toEqual(['evidencias', 'evidenciasOcultas', 'id', 'ocorrencias', 'severidade', 'sugestao', 'titulo', 'total', 'unidade']);
      expect(s.titulo).toBe(CATALOGO_SINAIS[s.id].titulo);
      expect(s.sugestao).toBe(CATALOGO_SINAIS[s.id].sugestao);
    }
  });

  it('limita as evidências e diz quantas ficaram de fora', () => {
    const muitos = Array.from({ length: LIMITE_EVIDENCIAS + 7 }, (_, i) => arq(`src/f${String(i).padStart(2, '0')}.js`, `// ${MARCA}`));
    const s = sinal(calcularSinais(muitos), 'marcadores-pendentes');
    expect(s.evidencias).toHaveLength(LIMITE_EVIDENCIAS);
    expect(s.evidenciasOcultas).toBe(7);
    expect(s.total).toBe(LIMITE_EVIDENCIAS + 7);
  });

  it('árvore limpa não tem sinal, e o resumo conta por severidade', () => {
    expect(calcularSinais([])).toEqual([]);
    expect(resumirSinais(calcularSinais(fixture()))).toEqual({ total: 5, alta: 1, media: 3, baixa: 1 });
  });
});
