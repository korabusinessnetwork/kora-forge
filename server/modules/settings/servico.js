import fs from 'node:fs';
import path from 'node:path';
import { SETTINGS_PADRAO, settingsSchema } from '../../../shared/schemas/settings.js';
import { ErroForge } from '../../lib/erro.js';

const CHAVES = Object.keys(SETTINGS_PADRAO);

function erroWorkspace(mensagem) {
  return new ErroForge('FORGE_VALIDATION', mensagem, { issues: [{ caminho: 'workspace', mensagem }] });
}

export function ehCaminhoAbsoluto(caminho) {
  return path.posix.isAbsolute(caminho) || path.win32.isAbsolute(caminho);
}

// Workspace é a raiz de toda escrita em disco (C4). Precisa ser absoluto, sem "..", e existir.
export function normalizarWorkspace(bruto) {
  if (bruto === null || bruto === undefined) return null;
  const texto = String(bruto).trim();
  if (texto === '') return null;
  if (!ehCaminhoAbsoluto(texto)) {
    throw erroWorkspace('O workspace precisa ser um caminho absoluto, por exemplo D:\\dev\\kora ou /home/voce/dev.');
  }
  // ".." é checado antes de normalizar, porque normalize resolve o segmento e esconderia a intenção.
  if (texto.split(/[\\/]/).includes('..')) throw erroWorkspace('O workspace não pode conter "..".');
  const estiloWindows = path.win32.isAbsolute(texto) && !path.posix.isAbsolute(texto);
  const normalizado = estiloWindows ? path.win32.normalize(texto) : path.posix.normalize(texto);
  const semBarraFinal = normalizado.replace(/([^:\\/])[\\/]+$/, '$1');
  let stat;
  try {
    stat = fs.statSync(semBarraFinal);
  } catch {
    throw erroWorkspace('Essa pasta não existe. Crie a pasta e tente de novo.');
  }
  if (!stat.isDirectory()) throw erroWorkspace('O caminho aponta para um arquivo, não para uma pasta.');
  return semBarraFinal;
}

export function criarServicoSettings({ db, padrao = SETTINGS_PADRAO, registrarEvento = () => true }) {
  const lerTudo = db.prepare('SELECT chave, valor FROM settings');
  const gravar = db.prepare(`
    INSERT INTO settings (chave, valor, atualizado_em) VALUES (@chave, @valor, @agora)
    ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor, atualizado_em = excluded.atualizado_em
  `);
  const gravarVarias = db.transaction((entradas) => {
    for (const entrada of entradas) gravar.run(entrada);
  });

  function obter() {
    const atual = { ...SETTINGS_PADRAO, ...padrao };
    for (const linha of lerTudo.all()) {
      if (!CHAVES.includes(linha.chave)) continue;
      try {
        atual[linha.chave] = JSON.parse(linha.valor);
      } catch {
        // valor corrompido no banco: mantém o default e deixa o contrato decidir
      }
    }
    return settingsSchema.parse(atual);
  }

  function atualizar(patch) {
    const alteracoes = {};
    if (patch.workspace !== undefined) alteracoes.workspace = normalizarWorkspace(patch.workspace);
    if (patch.tema !== undefined) alteracoes.tema = patch.tema;
    if (patch.copilotoTetoUsd !== undefined) alteracoes.copilotoTetoUsd = patch.copilotoTetoUsd;
    const chaves = Object.keys(alteracoes);
    if (chaves.length === 0) return obter();
    const agora = new Date().toISOString();
    gravarVarias(chaves.map((chave) => ({ chave, valor: JSON.stringify(alteracoes[chave]), agora })));
    registrarEvento('settings.atualizadas', { chaves });
    return obter();
  }

  return { obter, atualizar };
}
