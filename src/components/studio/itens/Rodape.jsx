import estilos from './itens.module.css';

// Região. A faixa do fim da página.
export default function Rodape({ props, children }) {
  return <footer className={estilos.rodape}>{children}</footer>;
}
