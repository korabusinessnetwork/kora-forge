import { executar } from '../../lib/processo.js';
import { COMANDOS_PERMITIDOS } from '../../../shared/comandos.js';

// F-02, passo 1: ferramenta ausente é detectada antes de começar, não no meio (RN-06.5).
export const REQUISITOS_BASE = Object.freeze([{ bin: 'node', min: '20' }, { bin: 'git', min: null }]);

export function extrairVersao(saida) {
  const achado = String(saida).match(/(\d+)\.(\d+)\.(\d+)/) ?? String(saida).match(/(\d+)\.(\d+)/);
  return achado ? achado[0] : null;
}

export function versaoAtende(encontrada, minima) {
  if (!minima) return true;
  if (!encontrada) return false;
  const maior = Number(String(encontrada).split('.')[0]);
  const alvo = Number(String(minima).split('.')[0]);
  return Number.isFinite(maior) && Number.isFinite(alvo) && maior >= alvo;
}

// Base e preset se somam, e quando os dois falam do mesmo binário o mínimo mais exigente vence.
export function juntarRequisitos(preset) {
  const porBin = new Map();
  for (const requisito of [...REQUISITOS_BASE, ...(preset?.requisitos ?? [])]) {
    const atual = porBin.get(requisito.bin);
    const novoMin = requisito.min ?? null;
    if (!atual) {
      porBin.set(requisito.bin, { bin: requisito.bin, min: novoMin });
      continue;
    }
    if (novoMin && (!atual.min || Number(novoMin.split('.')[0]) > Number(atual.min.split('.')[0]))) {
      porBin.set(requisito.bin, { bin: requisito.bin, min: novoMin });
    }
  }
  return [...porBin.values()];
}

async function versaoDe(bin, cwd) {
  if (!COMANDOS_PERMITIDOS.includes(bin)) return null;
  let saida = '';
  try {
    const { terminou } = executar({ cmd: bin, args: ['--version'], cwd, timeoutMs: 15000, onLinha: (_stream, linha) => { saida += `${linha}\n`; } });
    const resultado = await terminou;
    if (resultado.estado !== 'sucesso') return null;
  } catch {
    return null;
  }
  return extrairVersao(saida);
}

export async function checarRequisitos(preset, cwd) {
  const lista = juntarRequisitos(preset);
  const resultados = [];
  for (const requisito of lista) {
    const encontrada = await versaoDe(requisito.bin, cwd);
    resultados.push({ bin: requisito.bin, min: requisito.min, encontrada, ok: encontrada !== null && versaoAtende(encontrada, requisito.min) });
  }
  return resultados;
}
