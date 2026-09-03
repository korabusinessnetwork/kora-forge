import { mensagens } from '../../../mensagens.js';
import estilos from './Fundacao.module.css';

// Etapas que o preset liga mas que só ganham tela em fases posteriores (design, apis).
// Continuar marca a etapa como assumida, que é o comportamento honesto de "usei o padrão".
export default function EtapaFutura({ etapa }) {
  const m = mensagens.wizard.passos.futura[etapa];
  return <p className={estilos.texto}>{m.texto}</p>;
}
