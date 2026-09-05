import estilos from './itens.module.css';

// Região. A faixa do topo da página.
export default function Cabecalho({ props, children }) {
  return <header className={estilos.cabecalho}>{children}</header>;
}
