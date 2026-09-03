import CartaoPreset from '../../components/registry/CartaoPreset/CartaoPreset.jsx';
import { mensagens } from '../../mensagens.js';
import estilos from './PaginaRegistry.module.css';

// Estado vazio do Registry: nunca tela em branco, os menus são a próxima ação.
export default function VazioRegistry({ presets }) {
  const m = mensagens.registry.vazio;
  return (
    <div className={estilos.vazio}>
      <h2>{m.titulo}</h2>
      <p className={estilos.texto}>{m.texto}</p>
      <div className={estilos.menus}>
        {presets.map((preset) => (
          <CartaoPreset key={preset.id} preset={preset} to={`/novo?preset=${encodeURIComponent(preset.id)}`} />
        ))}
      </div>
    </div>
  );
}
