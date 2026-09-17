import estilos from './itens.module.css';

// Componente container. Superfície que agrupa conteúdo dentro de uma seção.
export default function Cartao({ props, children }) {
  return <article className={estilos.cartao}>{children}</article>;
}
