import { mensagens } from '../../../mensagens.js';
import estilos from './TrilhaEtapas.module.css';

export function estadoDaEtapa(etapa, { atual, concluidas, assumidas, visitaveis }) {
  if (etapa === atual) return 'atual';
  if (concluidas.includes(etapa)) return 'concluida';
  if (assumidas.includes(etapa)) return 'assumida';
  return visitaveis.includes(etapa) ? 'visitada' : 'pendente';
}

// Organism. Trilha de etapas do preset. Etapa à frente da atual não é clicável, porque o
// wizard conduz; voltar a uma etapa já vista é livre.
export default function TrilhaEtapas({ etapas, atual, concluidas = [], assumidas = [], bloqueadas = [], onIr }) {
  const m = mensagens.wizard;
  const indiceAtual = etapas.indexOf(atual);
  const visitaveis = etapas.slice(0, Math.max(indiceAtual, 0));
  return (
    <nav className={estilos.trilha} aria-label={m.trilha}>
      <ol className={estilos.lista}>
        {etapas.map((etapa, indice) => {
          const estado = estadoDaEtapa(etapa, { atual, concluidas, assumidas, visitaveis });
          const clicavel = estado !== 'pendente' && estado !== 'atual' && !bloqueadas.includes(etapa);
          return (
            <li key={etapa}>
              <button
                type="button"
                className={[estilos.item, estilos[estado]].join(' ')}
                aria-current={estado === 'atual' ? 'step' : undefined}
                disabled={!clicavel}
                onClick={() => onIr?.(etapa)}
              >
                <span className={estilos.numero}>{indice + 1}</span>
                <span className={estilos.nome}>{mensagens.etapas[etapa]}</span>
                <span className={estilos.estado}>{m.estado[estado]}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
