import { useRef, useState } from 'react';
import Botao from '../../shared/Botao/Botao.jsx';
import { DIRECOES } from '../../../features/studio/documento.js';
import { mensagens } from '../../../mensagens.js';
import estilos from './PainelCamadas.module.css';

const m = mensagens.studio.camadas;

// Organism. A estrutura do projeto inteira em um widget só: página, região e componente na mesma
// árvore. Barra de páginas separada seria um segundo lugar para a mesma coisa, e o princípio nº 1
// existe justamente para não haver dois.
//
// Este é o controle acessível do Studio. O canvas é conveniência de mouse; quem navega por teclado
// faz tudo aqui, e por isso a árvore segue o padrão ARIA de tree com roving tabindex: a tabulação
// entra uma vez e as setas andam por dentro.
export default function PainelCamadas({
  linhas,
  selecao,
  onSelecionar,
  onMover,
  onRemover,
  onNovaPagina,
  podeMover,
  somenteLeitura = false,
}) {
  const [confirmando, setConfirmando] = useState(null);
  const referencias = useRef(new Map());

  const selecionada = (linha) => (linha.escopo === 'pagina' ? selecao.no === null && selecao.pagina === linha.id : selecao.no === linha.id);
  const indiceAtual = Math.max(0, linhas.findIndex(selecionada));

  // A seleção acompanha o foco, que é o comportamento normal de árvore de item único: a seta move
  // e seleciona ao mesmo tempo, em vez de exigir um Enter a cada passo.
  const irPara = (indice) => {
    const destino = linhas[indice];
    if (!destino) return;
    onSelecionar(destino);
    referencias.current.get(destino.chave)?.focus();
  };

  const irParaOPai = (linha, indice) => {
    for (let atras = indice - 1; atras >= 0; atras -= 1) {
      if (linhas[atras].nivel < linha.nivel) return irPara(atras);
    }
    return undefined;
  };

  const irParaOFilho = (linha, indice) => {
    const proxima = linhas[indice + 1];
    if (proxima && proxima.nivel > linha.nivel) irPara(indice + 1);
  };

  const pedirRemocao = (linha) => {
    // Confirmação só quando a remoção leva gente junto. Nada foi escrito em disco ainda e o
    // desfazer devolve na hora, então perguntar em toda folha seria atrito sem proteção.
    if (linha.dentro > 0) setConfirmando(linha.chave);
    else onRemover(linha);
  };

  const aoTeclar = (evento, linha, indice) => {
    if (evento.altKey) {
      const direcao = { ArrowUp: 'cima', ArrowDown: 'baixo', ArrowRight: 'entrar', ArrowLeft: 'sair' }[evento.key];
      if (!direcao || somenteLeitura || linha.escopo === 'pagina') return;
      evento.preventDefault();
      onMover(linha, direcao);
      return;
    }
    switch (evento.key) {
      case 'ArrowDown': evento.preventDefault(); irPara(indice + 1); break;
      case 'ArrowUp': evento.preventDefault(); irPara(indice - 1); break;
      case 'ArrowRight': evento.preventDefault(); irParaOFilho(linha, indice); break;
      case 'ArrowLeft': evento.preventDefault(); irParaOPai(linha, indice); break;
      case 'Home': evento.preventDefault(); irPara(0); break;
      case 'End': evento.preventDefault(); irPara(linhas.length - 1); break;
      case 'Enter':
      case ' ': evento.preventDefault(); onSelecionar(linha); break;
      case 'Delete':
      case 'Backspace':
        if (somenteLeitura) break;
        evento.preventDefault();
        pedirRemocao(linha);
        break;
      default: break;
    }
  };

  return (
    <section className={estilos.painel} aria-labelledby="titulo-camadas">
      <h2 id="titulo-camadas" className={estilos.titulo}>{m.titulo}</h2>
      <p className={estilos.micro}>{m.micro}</p>

      {linhas.length === 0 ? (
        <div className={estilos.vazio}>
          <p className={estilos.vazioTitulo}>{m.vazio.titulo}</p>
          <p className={estilos.micro}>{m.vazio.texto}</p>
          <Botao onClick={onNovaPagina} desabilitado={somenteLeitura}>{m.vazio.acao}</Botao>
        </div>
      ) : (
        <>
          <ul role="tree" aria-label={m.arvore} className={estilos.arvore}>
            {linhas.map((linha, indice) => (
              <li
                key={linha.chave}
                role="treeitem"
                aria-level={linha.nivel}
                aria-selected={selecionada(linha)}
                tabIndex={indice === indiceAtual ? 0 : -1}
                ref={(elemento) => {
                  if (elemento) referencias.current.set(linha.chave, elemento);
                  else referencias.current.delete(linha.chave);
                }}
                className={[estilos.linha, selecionada(linha) ? estilos.ativa : null, linha.pendente ? estilos.pendente : null].filter(Boolean).join(' ')}
                data-nivel={linha.nivel}
                onClick={() => onSelecionar(linha)}
                onKeyDown={(evento) => aoTeclar(evento, linha, indice)}
              >
                <span className={estilos.nome}>{linha.nome}</span>
                {linha.resumo ? <span className={estilos.resumo}>{linha.resumo}</span> : null}
                {linha.pendente ? <span className={estilos.selo}>{m.pendente}</span> : null}
              </li>
            ))}
          </ul>

          <p className={estilos.micro}>{m.atalhos}</p>

          <div className={estilos.acoes}>
            <Botao variante="secundario" onClick={onNovaPagina} desabilitado={somenteLeitura}>{m.novaPagina}</Botao>
            {linhas[indiceAtual] ? (
              <>
                {DIRECOES.map((direcao) => (
                  <Botao
                    key={direcao}
                    variante="fantasma"
                    onClick={() => onMover(linhas[indiceAtual], direcao)}
                    desabilitado={somenteLeitura || linhas[indiceAtual].escopo === 'pagina' || !podeMover(linhas[indiceAtual], direcao)}
                    aria-label={`${m.mover[direcao]}: ${linhas[indiceAtual].nome}`}
                  >
                    {m.mover[direcao]}
                  </Botao>
                ))}
                <Botao
                  variante="destrutivo"
                  onClick={() => pedirRemocao(linhas[indiceAtual])}
                  desabilitado={somenteLeitura}
                  aria-label={m.removerRotulo(linhas[indiceAtual].nome)}
                >
                  {m.remover}
                </Botao>
              </>
            ) : null}
          </div>
        </>
      )}

      {confirmando ? (
        <div role="alertdialog" aria-label={m.remover} className={estilos.confirmacao}>
          {(() => {
            const alvo = linhas.find((linha) => linha.chave === confirmando);
            if (!alvo) return null;
            const pergunta = alvo.escopo === 'pagina' ? m.confirmarPagina(alvo.nome, alvo.dentro) : m.confirmarRemocao(alvo.nome, alvo.dentro);
            return (
              <>
                <p>{pergunta}</p>
                <div className={estilos.acoes}>
                  <Botao variante="destrutivo" onClick={() => { setConfirmando(null); onRemover(alvo); }}>{m.confirmar}</Botao>
                  <Botao variante="fantasma" onClick={() => setConfirmando(null)}>{m.cancelar}</Botao>
                </div>
              </>
            );
          })()}
        </div>
      ) : null}
    </section>
  );
}
