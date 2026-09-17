import { rotaSchema } from '@shared/schemas/design.js';
import Botao from '../../shared/Botao/Botao.jsx';
import Campo from '../../shared/Campo/Campo.jsx';
import CampoBooleano from '../../shared/CampoBooleano/CampoBooleano.jsx';
import Selecao from '../../shared/Selecao/Selecao.jsx';
import { mensagens } from '../../../mensagens.js';
import estilos from './PainelPropriedades.module.css';

const m = mensagens.studio.propriedades;

// Organism. Os campos vêm do catálogo, não de uma lista escrita à mão: item novo com prop nova
// aparece aqui sozinho, com o rótulo e o microtexto que o próprio item declarou. É a mesma ideia
// do `PainelTokens`, que deriva os campos de `listarTokens()`.
export default function PainelPropriedades({ selecionado, paginas = [], onTrocarCampoDaPagina, onTrocarProp, onRemover, somenteLeitura = false }) {
  return (
    <section className={estilos.painel} aria-labelledby="titulo-propriedades">
      <h2 id="titulo-propriedades" className={estilos.titulo}>{m.titulo}</h2>
      <p className={estilos.micro}>{m.micro}</p>
      {conteudo()}
    </section>
  );

  function conteudo() {
    if (!selecionado) return <p className={estilos.vazio}>{m.semSelecao}</p>;
    if (selecionado.escopo === 'pagina') return camposDaPagina(selecionado.pagina);
    if (!selecionado.item) return itemPendente(selecionado.no);
    return camposDoItem(selecionado.no, selecionado.item);
  }

  function camposDaPagina(pagina) {
    // Rota errada é avisada aqui, na hora, e não no salvar: o motor de regras da Fase 1 já
    // estabeleceu que aviso mora junto do campo que o causou (regra 7 do design system).
    const outra = paginas.find((atual) => atual.id !== pagina.id && atual.rota === pagina.rota);
    const rotaValida = rotaSchema.safeParse(pagina.rota).success;
    const erroDaRota = !rotaValida ? m.pagina.rotaInvalida : (outra ? m.pagina.rotaRepetida(outra.nome) : null);

    return (
      <div className={estilos.campos}>
        <p className={estilos.escopo}>{m.pagina.titulo}</p>
        <Campo
          id="pagina-nome"
          rotulo={m.pagina.nome}
          microtexto={m.pagina.nomeMicro}
          value={pagina.nome}
          erro={pagina.nome.trim() ? null : m.pagina.nomeVazio}
          disabled={somenteLeitura}
          onChange={(evento) => onTrocarCampoDaPagina('nome', evento.target.value)}
        />
        <Campo
          id="pagina-rota"
          rotulo={m.pagina.rota}
          microtexto={m.pagina.rotaMicro}
          value={pagina.rota}
          erro={erroDaRota}
          mono
          disabled={somenteLeitura}
          onChange={(evento) => onTrocarCampoDaPagina('rota', evento.target.value)}
        />
      </div>
    );
  }

  // Item que saiu do catálogo não ganha formulário inventado: sem o item não dá para saber que
  // props existiam nem de que tipo eram, e desenhar campos por adivinhação seria mentir sobre o
  // que o Forge sabe. O que ele pode fazer é mostrar o que está gravado e oferecer a saída.
  function itemPendente(no) {
    return (
      <div className={estilos.pendente} role="status">
        <p className={estilos.escopo}>{m.pendente.titulo}</p>
        <p className={estilos.micro}>{m.pendente.texto(no.tipo)}</p>
        <p className={estilos.micro}>{m.pendente.props}</p>
        <ul className={estilos.gravado}>
          {Object.entries(no.props ?? {}).map(([chave, valor]) => (
            <li key={chave}><code>{chave}</code>: <code>{String(valor)}</code></li>
          ))}
        </ul>
        <Botao variante="destrutivo" onClick={onRemover} desabilitado={somenteLeitura}>{mensagens.studio.camadas.remover}</Botao>
      </div>
    );
  }

  function camposDoItem(no, item) {
    return (
      <div className={estilos.campos}>
        <p className={estilos.escopo}>{item.nome}</p>
        <p className={estilos.micro}>{item.microtexto}</p>
        {item.props.length === 0 ? <p className={estilos.vazio}>{item.descricao}</p> : null}
        {item.props.map((prop) => renderizarProp(no, prop))}
      </div>
    );
  }

  function renderizarProp(no, prop) {
    const id = `prop-${no.id}-${prop.id}`;
    const valor = no.props?.[prop.id] ?? prop.padrao;
    const trocar = (novo) => onTrocarProp(prop, novo);

    if (prop.tipo === 'booleano') {
      return (
        <CampoBooleano
          key={prop.id}
          id={id}
          rotulo={prop.rotulo}
          microtexto={prop.microtexto}
          valor={valor === true}
          padrao={prop.padrao === true}
          disabled={somenteLeitura}
          onChange={somenteLeitura ? () => {} : trocar}
        />
      );
    }

    if (prop.tipo === 'opcao') {
      return (
        <Campo key={prop.id} id={id} rotulo={prop.rotulo} microtexto={prop.microtexto} padrao={prop.padrao}>
          <Selecao
            id={id}
            valor={String(valor)}
            onChange={somenteLeitura ? () => {} : trocar}
            disabled={somenteLeitura}
            opcoes={prop.opcoes.map((opcao) => ({ valor: opcao, rotulo: opcao, padraoKora: opcao === prop.padrao }))}
          />
        </Campo>
      );
    }

    return (
      <Campo
        key={prop.id}
        id={id}
        rotulo={prop.rotulo}
        microtexto={prop.microtexto}
        padrao={prop.padrao}
        type={prop.tipo === 'numero' ? 'number' : 'text'}
        value={String(valor)}
        disabled={somenteLeitura}
        erro={prop.obrigatoria && String(valor).trim() === '' ? mensagens.campo.obrigatorio : null}
        onChange={(evento) => trocar(prop.tipo === 'numero' ? Number(evento.target.value) : evento.target.value)}
      />
    );
  }
}
