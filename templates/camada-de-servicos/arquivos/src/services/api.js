// Cliente HTTP de {{PROJETO}}. Único arquivo do front que chama `fetch`.
// Toda resposta é validada contra o envelope antes de chegar em qualquer tela.
const BASE = import.meta.env.VITE_API_URL ?? '/api';

export class ErroApi extends Error {
  constructor(codigo, mensagem, detalhe = {}, status = 0) {
    super(mensagem ?? codigo);
    this.name = 'ErroApi';
    this.codigo = codigo;
    this.detalhe = detalhe;
    this.status = status;
  }
}

async function requisitar(metodo, caminho, corpo) {
  let resposta;
  try {
    resposta = await fetch(`${BASE}${caminho}`, {
      method: metodo,
      headers: corpo === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
  } catch {
    throw new ErroApi('OFFLINE', 'Não deu para falar com o servidor.');
  }

  let json;
  try {
    json = await resposta.json();
  } catch {
    throw new ErroApi('CONTRATO', 'A resposta não é JSON.', {}, resposta.status);
  }

  if (json?.error) throw new ErroApi(json.error.codigo, json.error.mensagem, json.error.detalhe ?? {}, resposta.status);
  return json?.data;
}

export const obter = (caminho) => requisitar('GET', caminho);
export const enviar = (caminho, corpo) => requisitar('POST', caminho, corpo);
export const alterar = (caminho, corpo) => requisitar('PATCH', caminho, corpo);
export const remover = (caminho) => requisitar('DELETE', caminho);
