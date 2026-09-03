import { envelopeSchema } from '@shared/schemas/envelope.js';
import { CODIGOS_ERRO } from '@shared/erros.js';
import { obterToken } from './sessao.js';

// Único ponto do front que fala com a API local. Componente nunca chama fetch.
// Toda resposta passa pelo schema do envelope antes de chegar em qualquer tela.
const BASE_PADRAO = '/api';

export class ErroApi extends Error {
  constructor(codigo, mensagem, detalhe = {}, status = 0) {
    super(mensagem ?? CODIGOS_ERRO[codigo]?.mensagem ?? codigo);
    this.name = 'ErroApi';
    this.codigo = codigo;
    this.detalhe = detalhe;
    this.status = status;
  }
}

function issuesDe(erroZod) {
  return erroZod.issues.map((issue) => ({ caminho: issue.path.map(String).join('.'), mensagem: issue.message }));
}

export function validarContrato(schema, dados) {
  const resultado = schema.safeParse(dados);
  if (resultado.success) return resultado.data;
  throw new ErroApi('FORGE_CONTRACT', CODIGOS_ERRO.FORGE_CONTRACT.mensagem, { issues: issuesDe(resultado.error) });
}

export async function requisitar(metodo, caminho, corpo, { fetchImpl = globalThis.fetch, base = BASE_PADRAO } = {}) {
  const token = obterToken();
  const cabecalhos = { Accept: 'application/json' };
  if (token) cabecalhos['X-Forge-Token'] = token;
  if (corpo !== undefined) cabecalhos['Content-Type'] = 'application/json';

  let resposta;
  try {
    resposta = await fetchImpl(`${base}${caminho}`, {
      method: metodo,
      headers: cabecalhos,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
  } catch {
    throw new ErroApi('FORGE_OFFLINE', CODIGOS_ERRO.FORGE_OFFLINE.mensagem);
  }

  let json;
  try {
    json = await resposta.json();
  } catch {
    throw new ErroApi('FORGE_CONTRACT', CODIGOS_ERRO.FORGE_CONTRACT.mensagem, { motivo: 'resposta não é JSON' }, resposta.status);
  }

  const envelope = envelopeSchema.safeParse(json);
  if (!envelope.success) {
    throw new ErroApi('FORGE_CONTRACT', CODIGOS_ERRO.FORGE_CONTRACT.mensagem, { issues: issuesDe(envelope.error) }, resposta.status);
  }
  if (envelope.data.error) {
    const { codigo, mensagem, detalhe } = envelope.data.error;
    throw new ErroApi(codigo, mensagem, detalhe, resposta.status);
  }
  return envelope.data.data;
}

export const obter = (caminho, opcoes) => requisitar('GET', caminho, undefined, opcoes);
export const enviar = (caminho, corpo, opcoes) => requisitar('POST', caminho, corpo, opcoes);
export const alterar = (caminho, corpo, opcoes) => requisitar('PATCH', caminho, corpo, opcoes);
