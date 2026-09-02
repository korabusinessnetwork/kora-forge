// Registro de eventos de domínio (padrão P-07). Fire-and-forget: nunca lança, nunca bloqueia
// a operação principal. Falha vira aviso no log, não silêncio.
const NOME_EVENTO = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

export function criarRegistradorDeEventos({ db, log = null }) {
  const inserir = db.prepare('INSERT INTO events (nome, project_id, payload_json, ts) VALUES (?, ?, ?, ?)');
  return function registrarEvento(nome, payload = null, projectId = null) {
    try {
      if (!NOME_EVENTO.test(nome)) throw new Error(`nome de evento fora do padrão dot.case: ${nome}`);
      inserir.run(nome, projectId, payload === null ? null : JSON.stringify(payload), new Date().toISOString());
      return true;
    } catch (erro) {
      log?.warn({ err: erro, evento: nome }, 'falha ao registrar evento');
      return false;
    }
  };
}
