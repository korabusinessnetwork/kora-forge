// Diagnóstico do Forge (ADR-014). Função pura sobre a lista de arquivos que a varredura leu: não
// toca em disco, não lê relógio e não depende da ordem de entrada. Mesma árvore, mesmo resultado.
//
// Os textos dos sinais são catálogo de domínio, como o catálogo de regras: saem no diagnóstico e
// entram na spec gerada, então vivem aqui e não em `src/mensagens`.

export const LIMITE_LINHAS = 400;
export const LIMITE_EVIDENCIAS = 20;
export const SEVERIDADES = Object.freeze(['alta', 'media', 'baixa']);
export const UNIDADES = Object.freeze(['ocorrencias', 'linhas', 'criterios', 'blocos', 'arquivos']);

export const CATALOGO_SINAIS = Object.freeze({
  'specs-com-criterio-pendente': {
    titulo: 'Specs com critério de aceite fora do sim',
    severidade: 'alta',
    unidade: 'criterios',
    sugestao: 'Retome o /review dessas specs: corrija o que falta ou registre a decisão que ficou pendente.',
  },
  'console-log-em-produto': {
    titulo: 'console.log esquecido em código de produto',
    severidade: 'media',
    unidade: 'ocorrencias',
    sugestao: 'Troque por log estruturado do servidor, ou remova. A constituição proíbe console.log esquecido.',
  },
  'marcadores-pendentes': {
    titulo: 'Marcadores de pendência no código',
    severidade: 'media',
    unidade: 'ocorrencias',
    sugestao: 'Transforme cada marcador em item de backlog com dono, ou resolva e apague o comentário.',
  },
  'specs-sem-auditoria': {
    titulo: 'Specs sem seção de auditoria',
    severidade: 'media',
    unidade: 'arquivos',
    sugestao: 'Rode o /review dessas specs e registre a auditoria critério a critério.',
  },
  'arquivos-grandes': {
    titulo: `Arquivos de produto com mais de ${LIMITE_LINHAS} linhas`,
    severidade: 'baixa',
    unidade: 'linhas',
    sugestao: 'Veja se o arquivo mistura responsabilidades e divida por assunto, um componente ou serviço por arquivo.',
  },
  'backlog-nao-entregue': {
    titulo: 'Blocos do backlog ainda não entregues',
    severidade: 'baixa',
    unidade: 'blocos',
    sugestao: 'Escolha o próximo bloco e abra a spec dele pelo loop spec, build e review.',
  },
  'sem-teste-colocalizado': {
    titulo: 'Arquivos de servidor ou shared sem teste na mesma pasta',
    severidade: 'baixa',
    unidade: 'linhas',
    sugestao: 'Função pura nasce com teste. Crie o teste ao lado do arquivo, começando pelos maiores.',
  },
});

const PRODUTO = /^(src|server|shared)\//;
const CODIGO = /\.jsx?$/;
const TESTE = /\.test\.[jt]sx?$/;
const FORA_DE_PRODUTO = /(^|\/)(testes|fixtures)\//;

// Marcador só conta logo depois de abrir comentário, para string e nome de variável não acusarem.
const MARCADOR = /(?:\/\/|\/\*|^\s*\*)\s*(?:TODO|FIXME|XXX)\b/gm;
const CONSOLE_LOG = /(?<![\w.])console\s*\.\s*log\s*\(/g;
const SECAO_AUDITORIA = /^##\s+(?:\d+\.?\s*)?(auditoria|review|revis[aã]o)\b/i;
const COLUNA_APROVACAO = /^(sim\??|atende|aprovado|resultado)$/i;

const linhasDe = (texto) => texto.split(/\r?\n/);
const contar = (texto, padrao) => (texto.match(padrao) ?? []).length;
const comparar = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function semComentario(texto) {
  return texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function ehCodigoDeProduto(caminho) {
  return PRODUTO.test(caminho) && CODIGO.test(caminho) && !TESTE.test(caminho) && !FORA_DE_PRODUTO.test(caminho);
}

function pastaDe(caminho) {
  const indice = caminho.lastIndexOf('/');
  return indice < 0 ? '' : caminho.slice(0, indice);
}

function nomeDe(caminho) {
  return caminho.slice(caminho.lastIndexOf('/') + 1);
}

function celulas(linha) {
  const limpa = linha.trim().replace(/^\|/, '').replace(/\|$/, '');
  return limpa.split('|').map((celula) => celula.trim());
}

// Linhas numeradas das tabelas da seção de auditoria cuja coluna de aprovação não diz sim.
// Tabela sem coluna de aprovação não é lida: sem ela não dá para afirmar nada.
function pendenciasDaAuditoria(linhasDaSecao) {
  let indiceAprovacao = -1;
  let pendentes = 0;
  for (const linha of linhasDaSecao) {
    if (!linha.trim().startsWith('|')) {
      indiceAprovacao = -1;
      continue;
    }
    const partes = celulas(linha);
    if (partes.every((parte) => /^:?-{3,}:?$/.test(parte) || parte === '')) continue;
    if (!/^\d+$/.test(partes[0])) {
      indiceAprovacao = partes.findIndex((parte) => COLUNA_APROVACAO.test(parte.replace(/\*/g, '')));
      continue;
    }
    if (indiceAprovacao < 0) continue;
    const valor = (partes[indiceAprovacao] ?? '').replace(/\*/g, '').trim().toLowerCase();
    if (!valor.startsWith('sim')) pendentes += 1;
  }
  return pendentes;
}

function auditoriaDaSpec(conteudo) {
  const linhas = linhasDe(conteudo);
  const inicio = linhas.findIndex((linha) => SECAO_AUDITORIA.test(linha));
  if (inicio < 0) return { temAuditoria: false, pendentes: 0 };
  const resto = linhas.slice(inicio + 1);
  const fim = resto.findIndex((linha) => /^##\s/.test(linha));
  return { temAuditoria: true, pendentes: pendenciasDaAuditoria(fim < 0 ? resto : resto.slice(0, fim)) };
}

function blocosNaoEntregues(conteudo) {
  let indiceEstado = -1;
  let pendentes = 0;
  for (const linha of linhasDe(conteudo)) {
    if (!linha.trim().startsWith('|')) {
      indiceEstado = -1;
      continue;
    }
    const partes = celulas(linha);
    if (partes.every((parte) => /^:?-{3,}:?$/.test(parte) || parte === '')) continue;
    if (/^bloco$/i.test(partes[0])) {
      indiceEstado = partes.findIndex((parte) => /^estado$/i.test(parte));
      continue;
    }
    if (indiceEstado < 0) continue;
    const estado = (partes[indiceEstado] ?? '').toLowerCase();
    if (!estado.includes('entregue') && !estado.includes('provado')) pendentes += 1;
  }
  return pendentes;
}

function montarSinal(id, evidencias) {
  const ordenadas = [...evidencias].sort((a, b) => {
    const porContagem = (b.contagem ?? Number.MAX_SAFE_INTEGER) - (a.contagem ?? Number.MAX_SAFE_INTEGER);
    return porContagem !== 0 ? porContagem : comparar(a.arquivo, b.arquivo);
  });
  const catalogo = CATALOGO_SINAIS[id];
  return {
    id,
    titulo: catalogo.titulo,
    severidade: catalogo.severidade,
    unidade: catalogo.unidade,
    sugestao: catalogo.sugestao,
    total: ordenadas.length,
    ocorrencias: ordenadas.reduce((soma, evidencia) => soma + (evidencia.contagem ?? 0), 0),
    evidencias: ordenadas.slice(0, LIMITE_EVIDENCIAS),
    evidenciasOcultas: Math.max(0, ordenadas.length - LIMITE_EVIDENCIAS),
  };
}

// `arquivos`: [{ caminho: 'src/a.js', conteudo: string | null }], caminho relativo com barra normal.
export function calcularSinais(arquivos, { limiteLinhas = LIMITE_LINHAS } = {}) {
  const lista = [...arquivos].sort((a, b) => comparar(a.caminho, b.caminho));
  const caminhos = new Set(lista.map((arquivo) => arquivo.caminho));
  const testesPorPasta = new Map();
  for (const arquivo of lista) {
    if (!TESTE.test(arquivo.caminho) || typeof arquivo.conteudo !== 'string') continue;
    const pasta = pastaDe(arquivo.caminho);
    testesPorPasta.set(pasta, [...(testesPorPasta.get(pasta) ?? []), arquivo.conteudo]);
  }

  const evidencias = Object.fromEntries(Object.keys(CATALOGO_SINAIS).map((id) => [id, []]));
  const anotar = (id, arquivo, contagem) => evidencias[id].push({ arquivo, contagem });

  for (const { caminho, conteudo } of lista) {
    const texto = typeof conteudo === 'string' ? conteudo : null;

    if (ehCodigoDeProduto(caminho)) {
      if (texto === null) {
        anotar('arquivos-grandes', caminho, null);
      } else {
        const marcadores = contar(texto, MARCADOR);
        if (marcadores > 0) anotar('marcadores-pendentes', caminho, marcadores);
        const logs = contar(semComentario(texto), CONSOLE_LOG);
        if (logs > 0) anotar('console-log-em-produto', caminho, logs);
        const linhas = linhasDe(texto).length;
        if (linhas > limiteLinhas) anotar('arquivos-grandes', caminho, linhas);
      }

      if (/^(server|shared)\//.test(caminho) && caminho.endsWith('.js')) {
        const base = nomeDe(caminho).replace(/\.js$/, '');
        const pasta = pastaDe(caminho);
        const irmao = `${pasta}/${base}.test.js`;
        const importado = (testesPorPasta.get(pasta) ?? []).some((teste) => teste.includes(`./${base}.js'`) || teste.includes(`./${base}.js"`));
        if (!caminhos.has(irmao) && !importado) anotar('sem-teste-colocalizado', caminho, texto === null ? null : linhasDe(texto).length);
      }
      continue;
    }

    if (texto === null) continue;

    if (/^specs\/[^/]+\.md$/.test(caminho) && !nomeDe(caminho).startsWith('_')) {
      const { temAuditoria, pendentes } = auditoriaDaSpec(texto);
      if (!temAuditoria) anotar('specs-sem-auditoria', caminho, 1);
      else if (pendentes > 0) anotar('specs-com-criterio-pendente', caminho, pendentes);
      continue;
    }

    if (/^docs\/09_BACKLOG\/[^/]+\.md$/.test(caminho)) {
      const pendentes = blocosNaoEntregues(texto);
      if (pendentes > 0) anotar('backlog-nao-entregue', caminho, pendentes);
    }
  }

  const ordemSeveridade = (sinal) => SEVERIDADES.indexOf(sinal.severidade);
  return Object.entries(evidencias)
    .filter(([, achados]) => achados.length > 0)
    .map(([id, achados]) => montarSinal(id, achados))
    .sort((a, b) => ordemSeveridade(a) - ordemSeveridade(b) || comparar(a.id, b.id));
}

export function resumirSinais(sinais) {
  const resumo = { total: sinais.length, alta: 0, media: 0, baixa: 0 };
  for (const sinal of sinais) resumo[sinal.severidade] += 1;
  return resumo;
}

export function prioridadeDaSeveridade(severidade) {
  return { alta: 'alta', media: 'media', baixa: 'baixa' }[severidade] ?? 'media';
}
