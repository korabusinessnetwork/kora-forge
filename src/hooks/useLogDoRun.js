import { useEffect, useState } from 'react';
import { assinarLogDoRun } from '../services/logDeRun.js';

const VAZIO = { eventos: [], descartados: 0, estado: 'ocioso', erro: null };

/**
 * Assina o log ao vivo de um run e acumula o que chega.
 *
 * O serviço devolve a lista inteira a cada evento, porque reconectar traz o histórico de novo:
 * substituir é o que impede o log de duplicar. Trocar de `runId` cancela a assinatura anterior
 * e zera o estado, para nenhuma linha do run antigo vazar para o novo.
 *
 * `tentativa` existe para o botão de conectar de novo: mudá-la refaz a assinatura do mesmo run.
 */
export function useLogDoRun(runId, tentativa = 0) {
  const [estado, setEstado] = useState(VAZIO);

  useEffect(() => {
    if (!runId) {
      setEstado(VAZIO);
      return undefined;
    }
    setEstado({ ...VAZIO, estado: 'conectando' });
    const cancelar = assinarLogDoRun(runId, {
      onEventos: (eventos, { descartados }) => setEstado((atual) => ({ ...atual, eventos, descartados })),
      onEstado: (conexao, erro = null) => setEstado((atual) => ({ ...atual, estado: conexao, erro })),
    });
    return cancelar;
  }, [runId, tentativa]);

  return estado;
}

export default useLogDoRun;
