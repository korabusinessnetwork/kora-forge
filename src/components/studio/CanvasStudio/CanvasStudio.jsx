import Campo from '../../shared/Campo/Campo.jsx';
import Selecao from '../../shared/Selecao/Selecao.jsx';
import PalcoProjeto from '../itens/PalcoProjeto.jsx';
import NoDoCanvas from './NoDoCanvas.jsx';
import { mensagens } from '../../../mensagens.js';
import estilos from './CanvasStudio.module.css';

const m = mensagens.studio.canvas;

// Degraus nomeados, e não zoom contínuo: degrau é operável por teclado como qualquer seleção, e
// um valor arbitrário entre 63% e 64% não serve para nada que uma pessoa queira.
export const ZOOMS = Object.freeze(['50', '75', '100', '125']);
export const ZOOM_PADRAO = '100';

// Organism. O centro do Studio: a página desenhada com os tokens do projeto, dentro do palco
// isolado (P-06).
//
// Não há modo de arrastar a superfície nem grade de encaixe. O documento não guarda coordenada
// (ADR-009, decisão 2): a página é uma pilha em fluxo, o encaixe é a vaga na árvore que o `aceita`
// do pai autoriza, e o que passa da moldura rola. Zoom existe porque ver a página inteira de uma
// vez é uma necessidade real.
export default function CanvasStudio({
  pagina,
  itens,
  tokens,
  selecao,
  onSelecionar,
  vista,
  onTrocarVista,
  zoom,
  onTrocarZoom,
  amostra,
}) {
  return (
    <section className={estilos.canvas} aria-labelledby="titulo-canvas">
      <div className={estilos.barra}>
        <h2 id="titulo-canvas" className={estilos.titulo}>{m.titulo}</h2>
        <div className={estilos.controles}>
          <Campo id="canvas-vista" rotulo={m.vista} microtexto={m.vistaMicro}>
            <Selecao
              id="canvas-vista"
              valor={vista}
              onChange={onTrocarVista}
              opcoes={[
                { valor: 'pagina', rotulo: m.vistaPagina },
                { valor: 'amostra', rotulo: m.vistaAmostra },
              ]}
            />
          </Campo>
          {vista === 'pagina' ? (
            <Campo id="canvas-zoom" rotulo={m.zoom} microtexto={m.zoomMicro} padrao={`${ZOOM_PADRAO}%`}>
              <Selecao
                id="canvas-zoom"
                valor={zoom}
                onChange={onTrocarZoom}
                opcoes={ZOOMS.map((valor) => ({ valor, rotulo: `${valor}%`, padraoKora: valor === ZOOM_PADRAO }))}
              />
            </Campo>
          ) : null}
        </div>
      </div>

      <div className={estilos.moldura}>
        {vista === 'amostra' ? amostra : desenho()}
      </div>
    </section>
  );

  function desenho() {
    if (!pagina) {
      return (
        <div className={estilos.estado} role="status">
          <p className={estilos.estadoTitulo}>{m.semPagina.titulo}</p>
          <p className={estilos.estadoTexto}>{m.semPagina.texto}</p>
        </div>
      );
    }

    return (
      <div className={estilos.zoom} data-zoom={zoom}>
        <PalcoProjeto tokens={tokens} rotulo={m.regiao} className={estilos.palco}>
          {pagina.regioes.length === 0 ? null : pagina.regioes.map((regiao) => (
            <NoDoCanvas key={regiao.id} no={regiao} itens={itens} selecao={selecao} onSelecionar={onSelecionar} />
          ))}
        </PalcoProjeto>
        {pagina.regioes.length === 0 ? (
          <div className={estilos.estado} role="status">
            <p className={estilos.estadoTitulo}>{m.paginaVazia.titulo}</p>
            <p className={estilos.estadoTexto}>{m.paginaVazia.texto}</p>
          </div>
        ) : null}
      </div>
    );
  }
}
