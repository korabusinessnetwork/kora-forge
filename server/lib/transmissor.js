// Transmissor do log ao vivo. Guarda o histórico de cada run para quem conecta no meio não
// perder nada, e nunca deixa uma falha de socket derrubar a execução do comando.
export function criarTransmissor() {
  const porRun = new Map();

  function garantir(runId) {
    if (!porRun.has(runId)) porRun.set(runId, { historico: [], ouvintes: new Set() });
    return porRun.get(runId);
  }

  function publicar(runId, evento) {
    const canal = garantir(runId);
    canal.historico.push(evento);
    for (const ouvinte of canal.ouvintes) {
      try {
        ouvinte(evento);
      } catch {
        canal.ouvintes.delete(ouvinte);
      }
    }
  }

  function assinar(runId, ouvinte) {
    const canal = garantir(runId);
    for (const evento of canal.historico) {
      try {
        ouvinte(evento);
      } catch {
        return () => {};
      }
    }
    canal.ouvintes.add(ouvinte);
    return () => canal.ouvintes.delete(ouvinte);
  }

  const historico = (runId) => porRun.get(runId)?.historico ?? [];
  const esquecer = (runId) => porRun.delete(runId);

  return { publicar, assinar, historico, esquecer };
}
