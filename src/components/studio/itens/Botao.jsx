import estilos from './itens.module.css';

// Componente. A ação da região. Fora da ordem de tabulação: no canvas quem recebe o teclado é a
// árvore de camadas, e um botão focável aqui roubaria o foco de quem está navegando a estrutura.
export default function Botao({ props }) {
  return (
    <button type="button" tabIndex={-1} className={estilos.botao} data-variante={props.variante}>
      {props.texto}
    </button>
  );
}
