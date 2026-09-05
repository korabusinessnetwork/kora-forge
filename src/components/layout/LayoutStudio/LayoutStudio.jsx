import { mensagens } from '../../../mensagens.js';
import estilos from './LayoutStudio.module.css';

const m = mensagens.studio.layout;

// Template. A casca do Studio: camadas à esquerda, canvas ao centro, propriedades e tokens à
// direita. Só arranjo, nenhum estado: quem sabe o que vai em cada coluna é a feature.
//
// Em tela estreita as três colunas viram uma pilha, na ordem em que se trabalha: primeiro a
// estrutura, depois o que ela virou, depois o ajuste fino.
export default function LayoutStudio({ cabecalho, esquerda, centro, direita }) {
  return (
    <div className={estilos.layout}>
      {cabecalho}
      <div className={estilos.colunas}>
        <aside className={estilos.esquerda} aria-label={m.esquerda}>{esquerda}</aside>
        <div className={estilos.centro}>{centro}</div>
        <aside className={estilos.direita} aria-label={m.direita}>{direita}</aside>
      </div>
    </div>
  );
}
