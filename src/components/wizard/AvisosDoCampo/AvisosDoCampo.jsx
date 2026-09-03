import AvisoRegra from '../AvisoRegra/AvisoRegra.jsx';
import estilos from './AvisosDoCampo.module.css';

// Renderiza os hits ancorados em um campo, logo abaixo dele (regra de UI 7 do design system).
// Sem hits, não renderiza nada: vazio não vira ruído.
export default function AvisosDoCampo({ avisos = [], onDecidir, salvando, erro }) {
  if (avisos.length === 0) return null;
  return (
    <div className={estilos.grupo}>
      {avisos.map((hit) => (
        <AvisoRegra key={hit.id} hit={hit} onDecidir={(patch) => onDecidir(hit, patch)} salvando={salvando} erro={erro} />
      ))}
    </div>
  );
}
