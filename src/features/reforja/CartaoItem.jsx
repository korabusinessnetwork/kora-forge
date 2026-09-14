import { useState } from 'react';
import { acoesDe, estaAberto } from '@shared/reforja/estados.js';
import Botao from '../../components/shared/Botao/Botao.jsx';
import { mensagens } from '../../mensagens.js';
import SeloSeveridade from './SeloSeveridade.jsx';
import estilos from './CartaoItem.module.css';

const m = mensagens.reforja;
const nomeDoEstado = (estado) => (m.backlog.estados[estado] ?? estado).toLowerCase();

// Uma melhoria no trilho. Só oferece o que a máquina de estados permite; descartar pede confirmação
// na própria linha, sem modal, e restaurar desfaz.
export default function CartaoItem({ item, ocupado, onMudarEstado, onGerarSpec }) {
  const [confirmandoDescarte, setConfirmandoDescarte] = useState(false);
  const idTitulo = `item-${item.id}`;
  const acoes = acoesDe(item.estado);

  const rotuloDe = ({ acao, para }) => {
    if (acao === 'avancar') return m.backlog.acoes.avancar(nomeDoEstado(para));
    if (acao === 'voltar') return m.backlog.acoes.voltar(nomeDoEstado(para));
    return m.backlog.acoes[acao];
  };

  return (
    <article className={estilos.cartao} aria-labelledby={idTitulo} data-estado={item.estado}>
      <header className={estilos.cabecalho}>
        <h4 id={idTitulo} className={estilos.titulo}>{item.titulo}</h4>
        <SeloSeveridade nivel={item.prioridade} />
      </header>
      <p className={estilos.origem}>{m.origens[item.origem] ?? item.origem}</p>
      {item.descricao ? <p className={estilos.descricao}>{item.descricao}</p> : null}
      {item.specCaminho ? (
        <p className={estilos.spec}>
          {m.backlog.specEm} <span className={estilos.caminho}>{item.specCaminho}</span>
        </p>
      ) : null}

      {confirmandoDescarte ? (
        <div className={estilos.confirmacao} role="group" aria-label={m.backlog.confirmarDescarte}>
          <p className={estilos.pergunta}>{m.backlog.confirmarDescarte}</p>
          <div className={estilos.acoes}>
            <Botao
              variante="destrutivo"
              carregando={ocupado}
              onClick={() => onMudarEstado(item, 'descartada')}
            >
              {m.backlog.confirmarDescarteSim}
            </Botao>
            <Botao variante="fantasma" desabilitado={ocupado} onClick={() => setConfirmandoDescarte(false)}>
              {m.backlog.confirmarDescarteNao}
            </Botao>
          </div>
        </div>
      ) : (
        <div className={estilos.acoes}>
          {estaAberto(item.estado) ? (
            <Botao variante="secundario" desabilitado={ocupado} onClick={() => onGerarSpec(item)}>
              {m.backlog.acoes.gerarSpec}
            </Botao>
          ) : null}
          {acoes.map((acao) => (
            <Botao
              key={acao.acao}
              variante={acao.acao === 'avancar' || acao.acao === 'restaurar' ? 'primario' : 'fantasma'}
              desabilitado={ocupado}
              onClick={() => (acao.acao === 'descartar' ? setConfirmandoDescarte(true) : onMudarEstado(item, acao.para))}
            >
              {rotuloDe(acao)}
            </Botao>
          ))}
        </div>
      )}
    </article>
  );
}
