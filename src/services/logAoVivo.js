import { z } from 'zod';
import { obterToken } from './sessao.js';

// Único ponto do front que abre WebSocket. Componente nunca instancia socket, do mesmo jeito que
// nunca chama fetch: o contrato do evento é validado aqui antes de virar linha na tela.

// O browser não permite header customizado no handshake, então o token vai no subprotocolo,
// que não entra em query string nem em log de acesso (docs/11, C2).
const MARCADOR_TOKEN = 'forge-token';

export const eventoLogSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('linha'), stream: z.enum(['stdout', 'stderr']), linha: z.string(), ts: z.string() }),
  z.object({ tipo: z.literal('fim'), estado: z.string(), exitCode: z.number().int().nullable(), erro: z.string().nullable() }),
]);

export function urlDoRun(runId, local = globalThis.location) {
  const protocolo = local?.protocol === 'https:' ? 'wss:' : 'ws:';
  const hospedeiro = local?.host ?? '127.0.0.1';
  return `${protocolo}//${hospedeiro}/api/ws/runs/${encodeURIComponent(runId)}`;
}

// Evento fora do contrato é descartado em silêncio: uma linha estranha não pode derrubar a tela
// no meio de uma materialização.
export function interpretarEvento(dado) {
  if (typeof dado !== 'string') return null;
  let json;
  try {
    json = JSON.parse(dado);
  } catch {
    return null;
  }
  const resultado = eventoLogSchema.safeParse(json);
  return resultado.success ? resultado.data : null;
}

// Assina o log de um run. Devolve a função que fecha o socket, e é ela que o componente chama ao
// desmontar. `onEvento` só recebe evento já validado; `onEstado` acompanha a conexão em si.
export function assinarLog(runId, { onEvento, onEstado = () => {}, criarSocket } = {}) {
  const token = obterToken();
  if (!token) {
    onEstado('sem-sessao');
    return () => {};
  }

  const fabrica = criarSocket ?? ((url, protocolos) => new globalThis.WebSocket(url, protocolos));
  let fechadoPorNos = false;
  let socket;

  try {
    socket = fabrica(urlDoRun(runId), [MARCADOR_TOKEN, token]);
  } catch {
    onEstado('erro');
    return () => {};
  }

  onEstado('conectando');
  socket.onopen = () => onEstado('conectado');
  socket.onerror = () => onEstado('erro');
  socket.onclose = () => {
    if (!fechadoPorNos) onEstado('desconectado');
  };
  socket.onmessage = (mensagem) => {
    const evento = interpretarEvento(mensagem?.data);
    if (evento) onEvento(evento);
  };

  return () => {
    fechadoPorNos = true;
    try {
      socket.close();
    } catch {
      // socket já morto, nada a fechar
    }
  };
}
