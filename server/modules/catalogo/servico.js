import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  itemCatalogoSchema, chaveDaProp, CHAVE_FILHOS, CATALOGO_VERSAO,
  conferirDocumento, listarPendencias,
} from '../../../shared/schemas/catalogo.js';
import { chavesUsadas } from '../../../shared/template.js';
import { compararTexto } from '../../../shared/ordenar.js';
import { ErroForge } from '../../lib/erro.js';
import { formatarIssues } from '../../lib/validar.js';

export const PASTA_CATALOGO_BUILTIN = fileURLToPath(new URL('../../../catalogo/', import.meta.url));

function erroDeItem(id, mensagem, issues) {
  return new ErroForge('FORGE_VALIDATION', `Item de catálogo ${id}: ${mensagem}`, { issues });
}

// Item de catálogo fora do contrato derruba o boot, como preset, regra e template já fazem. Subir
// pela metade é pior: o Studio abriria oferecendo um item que o gerador não sabe escrever.
export function carregarCatalogoBuiltin(pasta = PASTA_CATALOGO_BUILTIN) {
  const ids = fs.readdirSync(pasta, { withFileTypes: true })
    .filter((entrada) => entrada.isDirectory())
    .map((entrada) => entrada.name)
    .sort(compararTexto);

  const itens = ids.map((id) => {
    const arquivoItem = path.join(pasta, id, 'item.json');
    let bruto;
    try {
      bruto = JSON.parse(fs.readFileSync(arquivoItem, 'utf8'));
    } catch (erro) {
      throw erroDeItem(id, 'item.json inválido.', [{ caminho: `${id}/item.json`, mensagem: erro.message }]);
    }

    const resultado = itemCatalogoSchema.safeParse(bruto);
    if (!resultado.success) {
      throw erroDeItem(id, 'fora do contrato.', formatarIssues(resultado.error).map((issue) => ({
        ...issue, caminho: `${id}/item.json:${issue.caminho}`,
      })));
    }
    if (resultado.data.id !== id) {
      throw erroDeItem(id, 'o id do manifesto não bate com a pasta.', [
        { caminho: `${id}/item.json`, mensagem: `id "${resultado.data.id}" na pasta "${id}"` },
      ]);
    }

    const arquivoFragmento = path.join(pasta, id, 'fragmento.jsx');
    if (!fs.existsSync(arquivoFragmento)) {
      throw erroDeItem(id, 'falta o fragmento.jsx.', [{ caminho: `${id}/fragmento.jsx`, mensagem: 'arquivo ausente' }]);
    }
    const fragmento = fs.readFileSync(arquivoFragmento, 'utf8');
    return { ...resultado.data, fragmento };
  });

  conferirCoerencia(itens);
  return itens;
}

// A amarração item → código gerado, conferida nos dois sentidos. É esta função que impede o
// risco registrado na fase 2: catálogo e template saindo de sincronia, com um item que desenha e
// não gera. Ela roda no boot, então a incoerência nunca chega à tela.
export function conferirCoerencia(itens) {
  const conhecidos = new Set(itens.map((item) => item.id));
  const issues = [];
  const anotar = (id, mensagem) => issues.push({ caminho: `${id}/item.json`, mensagem });

  for (const item of itens) {
    for (const filho of item.aceita) {
      if (!conhecidos.has(filho)) anotar(item.id, `aceita "${filho}", que não existe no catálogo.`);
    }

    const chaves = new Set(chavesUsadas(item.fragmento));
    const daProp = new Map(item.props.map((prop) => [chaveDaProp(prop.id), prop.id]));

    for (const chave of chaves) {
      if (chave === CHAVE_FILHOS) continue;
      if (!daProp.has(chave)) {
        issues.push({ caminho: `${item.id}/fragmento.jsx`, mensagem: `usa {{${chave}}}, que não é prop declarada nem a chave reservada {{${CHAVE_FILHOS}}}.` });
      }
    }
    for (const [chave, propId] of daProp) {
      if (!chaves.has(chave)) anotar(item.id, `declara a prop "${propId}" e o fragmento nunca usa {{${chave}}}.`);
    }

    // Folha com {{FILHOS}} seria filho que some na geração. Container sem {{FILHOS}}, idem.
    const aceitaFilhos = item.aceita.length > 0;
    if (aceitaFilhos && !chaves.has(CHAVE_FILHOS)) {
      anotar(item.id, `aceita filhos e o fragmento não tem {{${CHAVE_FILHOS}}}: o filho sumiria na geração.`);
    }
    if (!aceitaFilhos && chaves.has(CHAVE_FILHOS)) {
      anotar(item.id, `é folha e o fragmento usa {{${CHAVE_FILHOS}}}, que nunca teria conteúdo.`);
    }
  }

  if (issues.length > 0) {
    throw new ErroForge('FORGE_VALIDATION', 'Catálogo incoerente: item e fragmento não batem.', { issues });
  }
}

export function criarServicoCatalogo({ itens = carregarCatalogoBuiltin(), versao = CATALOGO_VERSAO } = {}) {
  const porId = new Map(itens.map((item) => [item.id, item]));

  // O fragmento não sai daqui. A paleta do canvas precisa de nome, microtexto, props e o que o
  // item aceita; o código de geração é assunto do servidor, e mandá-lo ao front seria superfície
  // a mais sem uso nenhum.
  function listar() {
    return {
      versao,
      itens: itens.map(({ fragmento, ...item }) => item),
    };
  }

  function obter(id) {
    return porId.get(id) ?? null;
  }

  // Recusa na escrita: o Studio não grava desenho que o gerador não saberia escrever.
  function validarDocumento(documento) {
    const issues = conferirDocumento(documento, porId);
    if (issues.length > 0) {
      throw new ErroForge('FORGE_VALIDATION', 'O desenho usa item ou propriedade que o catálogo não tem.', { issues });
    }
  }

  // Pendência na leitura: documento antigo continua abrindo inteiro, com o item ausente nomeado
  // (ADR-009, decisão 4). Nada é reescrito, nada é apagado.
  function pendenciasDe(documento) {
    return listarPendencias(documento, porId, versao);
  }

  return { listar, obter, validarDocumento, pendenciasDe, versao };
}
