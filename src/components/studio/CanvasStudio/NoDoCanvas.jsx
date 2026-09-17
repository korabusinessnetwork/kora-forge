import { renderizadorDe } from '../itens/registro.js';
import { propsPadrao } from '../../../features/studio/documento.js';
import { mensagens } from '../../../mensagens.js';
import estilos from './CanvasStudio.module.css';

const m = mensagens.studio.canvas;

// Molecule recursiva. Desenha um nó e os filhos dele, na mesma ordem do documento: a árvore da
// tela é a árvore que vai para o disco, sem tradução no meio.
//
// A moldura em volta (contorno de seleção, alvo de clique) é da **ferramenta** e por isso mora
// aqui, em `--forge-*`. O conteúdo é do **projeto** e mora em `itens/`, em `--projeto-*`. Os dois
// se encostam nesta linha e em nenhuma outra (P-06).
//
// O envoltório não é focável de propósito: quem navega por teclado usa o painel de camadas, que é
// uma árvore ARIA completa. Aqui, um alvo de foco por nó competiria com a árvore e daria dois
// caminhos para a mesma coisa, sem acrescentar nada.
export default function NoDoCanvas({ no, itens, selecao, onSelecionar }) {
  const item = itens.find((atual) => atual.id === no.tipo) ?? null;
  const Componente = renderizadorDe(no.tipo);

  const filhos = (no.filhos ?? []).map((filho) => (
    <NoDoCanvas key={filho.id} no={filho} itens={itens} selecao={selecao} onSelecionar={onSelecionar} />
  ));

  return (
    <div
      className={estilos.no}
      data-selecionado={selecao.no === no.id ? 'sim' : undefined}
      onClick={(evento) => {
        // Sem isto, clicar num título selecionaria também a seção e a página que o contêm.
        evento.stopPropagation();
        onSelecionar(no.id);
      }}
    >
      {Componente ? (
        // Prop ausente vale o padrão do catálogo, exatamente como o servidor decidiu no bloco 3.
        // Assim o canvas mostra o que o gerador escreveria, e não um buraco.
        <Componente props={{ ...propsPadrao(item ?? {}), ...no.props }}>{filhos}</Componente>
      ) : (
        <div className={estilos.desconhecido}>
          <p className={estilos.desconhecidoTexto}>{m.desconhecido(no.tipo)}</p>
          {filhos}
        </div>
      )}
    </div>
  );
}
