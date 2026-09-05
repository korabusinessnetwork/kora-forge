import PalcoProjeto from '../itens/PalcoProjeto.jsx';
import { mensagens } from '../../../mensagens.js';
import estilos from './PreviewProjeto.module.css';

const m = mensagens.studio.preview;

// Organism. A amostra dos tokens: um punhado de elementos que mostram cor, fonte, escala, raio e
// sombra de uma vez, sem depender de nenhuma página desenhada. Serve para ajustar token sem ter
// que montar uma página só para ver o efeito.
//
// O isolamento (P-06) mora no `PalcoProjeto`, que este componente e o canvas compartilham: um
// palco só, para não existir dois lugares onde o preview pode passar a mentir.
export default function PreviewProjeto({ tokens }) {
  return (
    <PalcoProjeto tokens={tokens} rotulo={m.regiao} className={estilos.amostra}>
      <h3 className={estilos.titulo}>{m.amostra.titulo}</h3>
      <p className={estilos.secundario}>{m.amostra.secundario}</p>

      <div className={estilos.botoes}>
        <span className={estilos.botao}>{m.amostra.botao}</span>
        <span className={estilos.botaoSecundario}>{m.amostra.botaoSecundario}</span>
      </div>

      <div className={estilos.cartao}>
        <p className={estilos.cartaoTitulo}>{m.amostra.cartaoTitulo}</p>
        <p className={estilos.secundario}>{m.amostra.cartaoTexto}</p>
      </div>

      <div className={estilos.campo}>
        <span className={estilos.campoRotulo}>{m.amostra.campoRotulo}</span>
        <span className={estilos.campoEntrada}>{m.amostra.campoPlaceholder}</span>
      </div>

      <p className={estilos.mono}>{m.amostra.mono}</p>

      <div className={estilos.estados}>
        <span className={estilos.sucesso}>{m.amostra.estados.sucesso}</span>
        <span className={estilos.aviso}>{m.amostra.estados.aviso}</span>
        <span className={estilos.perigo}>{m.amostra.estados.perigo}</span>
      </div>
    </PalcoProjeto>
  );
}
