import { eventoLogSchema } from '@shared/schemas/materializacao.js';
import { CODIGOS_ERRO } from '@shared/erros.js';
import { obterToken } from './sessao.js';
import { ErroApi } from './api.js';

// Único ponto do front que abre WebSocket. Componente nunca abre socket, do mesmo jeito que
// nunca chama fetch: quem fala com a API local é a camada de serviços.
//
// O token vai no **subprotocolo**, não em query string nem em header. O browser não permite
// header customizado no handshake, e query string entraria em log de acesso (docs/11, C2).
// A guarda do servidor lê dos dois lugares (`server/lib/guarda.js`).
const CAMINHO_BASE = '/api/ws/runs';
export const MARCADOR_DE_TOKEN = 'forge-token';

export function urlDoRun(runId, local = globalThis.location) {
  const protocolo = local?.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocolo}//${local?.host ?? '127.0.0.1'}${CAMINHO_BASE}/${encodeURIComponent(runId)}`;
}

/**
 * Assina o log ao vivo de um run.
 *
 * O servidor entrega o histórico já gravado ao conectar, então quem chega no meio não perde
 * nada — e é por isso que `onEventos` recebe a lista inteira desde o começo a cada mudança:
 * reconectar substitui, nunca concatena, senão o log duplicaria.
 *
 * Devolve a função de cancelar. Cancelar duas vezes é seguro.
 */
export function assinarLogDoRun(runId, { onEventos, onEstado, criarSocket } = {}) {
  const avisar = (estado, erro = null) => onEstado?.(estado, erro);
  const token = obterToken();

  if (!token) {
    avisar('erro', new ErroApi('FORGE_UNAUTHORIZED', CODIGOS_ERRO.FORGE_UNAUTHORIZED.mensagem));
    return () => {};
  }

  const eventos = [];
  let descartados = 0;
  let cancelado = false;
  let socket;

  const abrir = criarSocket ?? ((url, protocolos) => new globalThis.WebSocket(url, protocolos));

  try {
    socket = abrir(urlDoRun(runId), [MARCADOR_DE_TOKEN, token]);
  } catch {
    avisar('erro', new ErroApi('FORGE_OFFLINE', CODIGOS_ERRO.FORGE_OFFLINE.mensagem));
    return () => {};
  }

  avisar('conectando');

  socket.onopen = () => {
    if (!cancelado) avisar('conectado');
  };

  // Evento fora do contrato é descartado e contado, nunca derruba o painel: o log é observação
  // da execução, e uma mensagem estranha não pode matar a tela que mostra o que está rodando.
  socket.onmessage = (mensagem) => {
    if (cancelado) return;
    let bruto;
    try {
      bruto = JSON.parse(mensagem.data);
    } catch {
      descartados += 1;
      onEventos?.([...eventos], { descartados });
      return;
    }
    const resultado = eventoLogSchema.safeParse(bruto);
    if (!resultado.success) {
      descartados += 1;
      onEventos?.([...eventos], { descartados });
      return;
    }
    eventos.push(resultado.data);
    onEventos?.([...eventos], { descartados });
  };

  socket.onerror = () => {
    if (!cancelado) avisar('erro', new ErroApi('FORGE_OFFLINE', CODIGOS_ERRO.FORGE_OFFLINE.mensagem));
  };

  socket.onclose = () => {
    if (!cancelado) avisar('fechado');
  };

  return function cancelar() {
    if (cancelado) return;
    cancelado = true;
    try {
      socket.close();
    } catch {
      // socket já morto, nada a fechar
    }
  };
}
