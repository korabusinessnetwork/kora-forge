import Botao from '../../shared/Botao/Botao.jsx';
import { mensagens } from '../../../mensagens.js';
import estilos from './PaletaItens.module.css';

const m = mensagens.studio.paleta;

// Organism. O que dá para inserir no ponto onde a pessoa está. A lista vem pronta de
// `ondePodeEntrar()`, que é a mesma função que a inserção usa: não existe item que apareça aqui e
// a validação recuse depois. É assim que "zero elemento sem componente no catálogo" deixa de ser
// promessa e vira consequência.
export default function PaletaItens({ itens, nomeDaSelecao, temPagina, onAdicionar, somenteLeitura = false }) {
  // Estado vazio nunca é tela em branco: ele diz por que nada cabe ali e qual seleção resolveria.
  const vazio = () => {
    if (!temPagina) return m.vazioSemPagina;
    if (!nomeDaSelecao) return m.vazioSemSelecao;
    return m.vazioNaoAceita(nomeDaSelecao);
  };

  return (
    <section className={estilos.painel} aria-labelledby="titulo-paleta">
      <h2 id="titulo-paleta" className={estilos.titulo}>{m.titulo}</h2>
      <p className={estilos.micro}>{m.micro}</p>

      {itens.length === 0 ? (
        <p className={estilos.vazio}>{vazio()}</p>
      ) : (
        <ul className={estilos.lista}>
          {itens.map((item) => (
            <li key={item.id}>
              <Botao
                variante="secundario"
                className={estilos.item}
                onClick={() => onAdicionar(item)}
                desabilitado={somenteLeitura}
                aria-label={m.adicionarRotulo(item.nome)}
              >
                <span className={estilos.nome}>{item.nome}</span>
                <span className={estilos.itemMicro}>{item.microtexto}</span>
              </Botao>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
