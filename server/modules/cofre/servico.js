import fs from 'node:fs';
import path from 'node:path';
import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from 'node:crypto';
import { ErroForge } from '../../lib/erro.js';

const VERSAO = 1;
const PARAMETROS_SCRYPT = Object.freeze({ N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });

function b64(valor) { return Buffer.from(valor).toString('base64'); }
function deB64(valor) { return Buffer.from(valor, 'base64'); }
function derivar(senha, salt) { return scryptSync(senha, salt, 32, PARAMETROS_SCRYPT); }
function cifrar(texto, chave) {
  const nonce = randomBytes(12);
  const cifra = createCipheriv('aes-256-gcm', chave, nonce);
  return { nonce: b64(nonce), ciphertext: b64(Buffer.concat([cifra.update(texto, 'utf8'), cifra.final()])), tag: b64(cifra.getAuthTag()) };
}
function decifrar(registro, chave) {
  const decifra = createDecipheriv('aes-256-gcm', chave, deB64(registro.nonce));
  decifra.setAuthTag(deB64(registro.tag));
  return Buffer.concat([decifra.update(deB64(registro.ciphertext)), decifra.final()]).toString('utf8');
}

export function criarServicoCofre({ home }) {
  const arquivo = path.join(home, 'vault.bin');
  let chave = null;
  let documento = null;
  const estado = () => !fs.existsSync(arquivo) ? 'ausente' : chave ? 'destrancado' : 'trancado';
  function gravar() {
    const temporario = `${arquivo}.${randomBytes(8).toString('hex')}.tmp`;
    fs.mkdirSync(home, { recursive: true });
    fs.writeFileSync(temporario, JSON.stringify(documento), { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(temporario, arquivo);
  }
  function criar(senha) {
    if (fs.existsSync(arquivo)) throw new ErroForge('FORGE_CONFLICT', 'O cofre já existe. Destranque-o para continuar.');
    const salt = randomBytes(16);
    chave = derivar(senha, salt);
    documento = { versao: VERSAO, salt: b64(salt), verificador: cifrar('kora-forge-vault', chave), entradas: {} };
    gravar();
    return { estado: estado() };
  }
  function destrancar(senha) {
    if (!fs.existsSync(arquivo)) throw new ErroForge('FORGE_NOT_FOUND', 'Ainda não existe um cofre. Crie-o antes de adicionar uma chave.');
    try {
      const candidato = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
      if (candidato.versao !== VERSAO || typeof candidato.salt !== 'string' || !candidato.verificador || typeof candidato.entradas !== 'object') throw new Error('formato');
      const derivada = derivar(senha, deB64(candidato.salt));
      if (decifrar(candidato.verificador, derivada) !== 'kora-forge-vault') throw new Error('verificador');
      chave = derivada;
      documento = candidato;
    } catch {
      chave = null;
      documento = null;
      throw new ErroForge('FORGE_UNAUTHORIZED', 'Não foi possível destrancar o cofre.');
    }
    return { estado: estado() };
  }
  function guardar(id, segredo) {
    if (!chave || !documento) throw new ErroForge('FORGE_VAULT_LOCKED');
    documento.entradas[id] = cifrar(segredo, chave);
    gravar();
  }
  function apagar(id) {
    if (!chave || !documento) throw new ErroForge('FORGE_VAULT_LOCKED');
    delete documento.entradas[id];
    gravar();
  }
  function obter(id) {
    if (!chave || !documento) throw new ErroForge('FORGE_VAULT_LOCKED');
    const entrada = documento.entradas[id];
    if (!entrada) throw new ErroForge('FORGE_NOT_FOUND', 'Chave da conexao nao encontrada no cofre.');
    try { return decifrar(entrada, chave); } catch { throw new ErroForge('FORGE_UNAUTHORIZED', 'Nao foi possivel ler a chave da conexao.'); }
  }
  return { estado, criar, destrancar, guardar, apagar, obter };
}
