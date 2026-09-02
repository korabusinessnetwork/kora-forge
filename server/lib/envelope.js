// Envelope { data, error, meta } de toda resposta da API local.
// O símbolo marca um envelope já montado, para o hook de serialização não embrulhar duas vezes.
export const ENVELOPE = Symbol('forge.envelope');

function arredondar(ms) {
  return Math.round(ms * 100) / 100;
}

export function meta(request) {
  const inicio = typeof request.forgeInicio === 'number' && request.forgeInicio > 0
    ? request.forgeInicio
    : performance.now();
  return { requestId: String(request.id), duracaoMs: arredondar(performance.now() - inicio) };
}

export function envelopar(request, data, error = null) {
  const envelope = { data, error, meta: meta(request) };
  Object.defineProperty(envelope, ENVELOPE, { value: true, enumerable: false });
  return envelope;
}

export function envelopeDeErro(request, erro) {
  return envelopar(request, null, {
    codigo: erro.codigo,
    mensagem: erro.message,
    detalhe: erro.detalhe ?? {},
  });
}

export function ehEnvelope(payload) {
  return Boolean(payload) && payload[ENVELOPE] === true;
}
