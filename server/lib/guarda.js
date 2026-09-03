import { timingSafeEqual } from 'node:crypto';
import { ErroForge } from './erro.js';
import { envelopeDeErro } from './envelope.js';

// Guarda de toda rota sob /api (controles C1 e C2, restrições S-01 e S-02).
// Ordem: Host → token → Origin. Qualquer falha responde 401 com a mesma mensagem.
const METODOS_MUTANTES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function tokensIguais(recebido, esperado) {
  if (typeof recebido !== 'string' || typeof esperado !== 'string') return false;
  const a = Buffer.from(recebido, 'utf8');
  const b = Buffer.from(esperado, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function criarAllowlists({ porta, portaDev }) {
  const hosts = new Set([`127.0.0.1:${porta}`, `localhost:${porta}`]);
  const origens = new Set();
  for (const p of new Set([porta, portaDev].filter(Boolean))) {
    origens.add(`http://127.0.0.1:${p}`);
    origens.add(`http://localhost:${p}`);
  }
  return { hosts, origens };
}

// O browser não permite header customizado no handshake de WebSocket. O token vem no
// subprotocolo (`forge-token, <token>`), que não entra em query string nem em log de acesso.
export function tokenDoSubprotocolo(cabecalho) {
  if (typeof cabecalho !== 'string') return undefined;
  const partes = cabecalho.split(',').map((parte) => parte.trim());
  const marcador = partes.indexOf('forge-token');
  return marcador === -1 ? undefined : partes[marcador + 1];
}

export function avaliarRequisicao({ metodo, host, origin, token }, { tokenSessao, hosts, origens }) {
  if (typeof host !== 'string' || !hosts.has(host.toLowerCase())) return false;
  if (!tokensIguais(token, tokenSessao)) return false;
  if (origin !== undefined) return typeof origin === 'string' && origens.has(origin);
  return !METODOS_MUTANTES.has(String(metodo).toUpperCase());
}

export function criarGuarda({ tokenSessao, porta, portaDev }) {
  const listas = { tokenSessao, ...criarAllowlists({ porta, portaDev }) };
  return async function guarda(request, reply) {
    const permitido = avaliarRequisicao({
      metodo: request.method,
      host: request.headers.host,
      origin: request.headers.origin,
      token: request.headers['x-forge-token'] ?? tokenDoSubprotocolo(request.headers['sec-websocket-protocol']),
    }, listas);
    if (permitido) return undefined;
    const erro = new ErroForge('FORGE_UNAUTHORIZED');
    reply.code(erro.status);
    return reply.send(envelopeDeErro(request, erro));
  };
}
