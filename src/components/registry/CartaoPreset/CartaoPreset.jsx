import { Link } from 'react-router-dom';
import { mensagens } from '../../../mensagens.js';
import estilos from './CartaoPreset.module.css';

// Molecule. O menu na tela inicial: categoria, nome, o que gera, quantas etapas. Link ou botão.
export default function CartaoPreset({ preset, to, onEscolher }) {
  const m = mensagens.preset;
  const conteudo = (
    <>
      <span className={estilos.categoria}>{m.categoria[preset.categoria] ?? preset.categoria}</span>
      <span className={estilos.nome}>{preset.nome}</span>
      <span className={estilos.descricao}>{preset.descricao}</span>
      <span className={estilos.rodape}>{preset.etapas.length} {m.etapasSufixo} · v{preset.versao}</span>
    </>
  );
  if (to) return <Link to={to} className={estilos.cartao}>{conteudo}</Link>;
  return (
    <button type="button" className={estilos.cartao} onClick={() => onEscolher?.(preset)}>
      {conteudo}
    </button>
  );
}
