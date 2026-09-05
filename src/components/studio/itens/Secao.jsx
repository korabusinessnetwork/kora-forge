import estilos from './itens.module.css';

// Região. O bloco onde a maior parte do desenho vive.
export default function Secao({ props, children }) {
  return (
    <section className={estilos.secao} data-espacamento={props.espacamento}>
      {children}
    </section>
  );
}
