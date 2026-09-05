import { useEffect, useMemo, useReducer, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentoDesignSchema } from '@shared/schemas/design.js';
import { saoIguais } from '@shared/serializar.js';
import { obterProjeto } from '../../services/projetos.js';
import { obterDesign, salvarDesign } from '../../services/design.js';
import { obterCatalogo } from '../../services/catalogo.js';
import Botao from '../../components/shared/Botao/Botao.jsx';
import LayoutStudio from '../../components/layout/LayoutStudio/LayoutStudio.jsx';
import PainelCamadas from '../../components/studio/PainelCamadas/PainelCamadas.jsx';
import PaletaItens from '../../components/studio/PaletaItens/PaletaItens.jsx';
import PainelPropriedades from '../../components/studio/PainelPropriedades/PainelPropriedades.jsx';
import PainelTokens from '../../components/studio/PainelTokens/PainelTokens.jsx';
import CanvasStudio, { ZOOM_PADRAO } from '../../components/studio/CanvasStudio/CanvasStudio.jsx';
import PreviewProjeto from '../../components/studio/PreviewProjeto/PreviewProjeto.jsx';
import { encontrarNo, encontrarPagina, listarLinhas, ondePodeEntrar, podeMover } from './documento.js';
import { ESTADO_INICIAL, reducerStudio, rotuloDeDesfazer, rotuloDeRefazer } from './reducerStudio.js';
import { mensagens } from '../../mensagens.js';
import estilos from './PaginaStudio.module.css';

const m = mensagens.studio;

// O documento padrão, que é o que o projeto gera hoje quando ninguém abre o Studio. Serve de
// ponto de partida para o projeto que ainda não tem design, e de alvo do "usar o padrão Kora".
export const DOCUMENTO_PADRAO = Object.freeze(documentoDesignSchema.parse({}));

export default function PaginaStudio() {
  const { id } = useParams();
  const clienteQuery = useQueryClient();
  const projeto = useQuery({ queryKey: ['projeto', id], queryFn: () => obterProjeto(id) });
  const design = useQuery({ queryKey: ['design', id], queryFn: () => obterDesign(id) });
  const catalogo = useQuery({ queryKey: ['catalogo'], queryFn: obterCatalogo });

  const [estado, despachar] = useReducer(reducerStudio, ESTADO_INICIAL);
  // Zoom e vista são de quem está olhando, não do projeto: não entram no documento nem no disco.
  // `null` na vista quer dizer "decida por mim", e é o estado em que o Studio abre.
  const [vistaEscolhida, setVista] = useState(null);
  const [zoom, setZoom] = useState(ZOOM_PADRAO);

  const salvo = design.data?.payload ?? DOCUMENTO_PADRAO;
  const itens = catalogo.data?.itens ?? [];
  const pronto = estado.documento !== null;

  // Semeia o reducer uma vez, quando as duas consultas chegam. Salvar não re-semeia: o documento
  // gravado é o mesmo que está na tela, e zerar a história a cada gravação castigaria justamente
  // quem salva com frequência.
  useEffect(() => {
    if (!design.isSuccess || !catalogo.isSuccess || pronto) return;
    despachar({ tipo: 'iniciar', documento: design.data?.payload ?? DOCUMENTO_PADRAO, itens: catalogo.data.itens });
  }, [design.isSuccess, catalogo.isSuccess, design.data, catalogo.data, pronto]);

  // Desfazer e refazer de qualquer lugar do Studio, menos de dentro de um campo de texto: lá o
  // desfazer do navegador é o certo, e sequestrá-lo quebraria a digitação.
  useEffect(() => {
    const aoTeclar = (evento) => {
      if (!evento.ctrlKey && !evento.metaKey) return;
      const alvo = evento.target;
      const digitando = alvo?.tagName === 'INPUT' || alvo?.tagName === 'TEXTAREA' || alvo?.isContentEditable;
      if (digitando) return;
      const tecla = String(evento.key).toLowerCase();
      if (tecla === 'z' && !evento.shiftKey) {
        evento.preventDefault();
        despachar({ tipo: 'desfazer' });
      } else if ((tecla === 'z' && evento.shiftKey) || tecla === 'y') {
        evento.preventDefault();
        despachar({ tipo: 'refazer' });
      }
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, []);

  const salvar = useMutation({
    mutationFn: (documento) => salvarDesign(id, documento),
    onSuccess: (gravado) => clienteQuery.setQueryData(['design', id], gravado),
  });

  const documento = estado.documento ?? salvo;
  // Sem página nenhuma, o centro mostra a amostra de tokens: é o que dá para mostrar, e é o
  // trabalho do bloco 2, que não deve sumir só porque o canvas chegou. Assim que existe uma
  // página, o padrão passa a ser ela, até alguém escolher o contrário.
  const vista = vistaEscolhida ?? (documento.paginas.length > 0 ? 'pagina' : 'amostra');

  const linhas = useMemo(() => listarLinhas(documento, itens), [documento, itens]);
  const selecionado = useMemo(() => {
    if (!estado.selecao.pagina) return null;
    if (!estado.selecao.no) return { escopo: 'pagina', pagina: encontrarPagina(documento, estado.selecao.pagina) };
    const alvo = encontrarNo(documento, estado.selecao.no);
    if (!alvo) return null;
    return { escopo: 'no', no: alvo.no, item: itens.find((item) => item.id === alvo.no.tipo) ?? null };
  }, [documento, itens, estado.selecao]);

  if (projeto.isPending || design.isPending || catalogo.isPending) {
    return <p role="status" className={estilos.estado}>{mensagens.estados.carregando}</p>;
  }

  if (projeto.isError || design.isError || catalogo.isError) {
    const erro = projeto.error ?? design.error ?? catalogo.error;
    const naoEncontrado = erro?.codigo === 'FORGE_NOT_FOUND';
    return (
      <div role="alert" className={estilos.erro}>
        <p>{naoEncontrado ? m.naoEncontrado : (erro?.message ?? m.erroCarregar)}</p>
        {naoEncontrado
          ? <Link to="/">{mensagens.projeto.voltar}</Link>
          : <Botao variante="secundario" onClick={() => { projeto.refetch(); design.refetch(); catalogo.refetch(); }}>{mensagens.estados.tentarDeNovo}</Botao>}
      </div>
    );
  }

  const arquivado = projeto.data.projeto.status === 'arquivado';
  const mudou = !saoIguais(documento, salvo);
  const erroSalvar = salvar.isError ? (salvar.error?.detalhe?.issues ?? [{ mensagem: salvar.error?.message ?? m.erroSalvar }]) : null;

  // As pendências são calculadas contra o catálogo que está na mão, e não copiadas da resposta da
  // API: assim, remover o item some com o aviso na hora, em vez de só depois de gravar.
  const pendentes = linhas.filter((linha) => linha.pendente);
  const podeSalvar = mudou && !arquivado && pendentes.length === 0;

  const paginaAtual = encontrarPagina(documento, estado.selecao.pagina);
  const oferecidos = ondePodeEntrar(itens, documento, estado.selecao);
  const nomeDaSelecao = selecionado?.escopo === 'no' ? (selecionado.item?.nome ?? selecionado.no.tipo) : null;
  const nomeDaNovaPagina = documento.paginas.length === 0 ? m.camadas.nomeDaPrimeira : m.camadas.nomeDaProxima;

  return (
    <section className={estilos.pagina} aria-labelledby="titulo-studio">
      <LayoutStudio
        cabecalho={(
          <header className={estilos.cabecalho}>
            <p className={estilos.voltar}><Link to={`/projetos/${id}`}>{m.voltar}</Link></p>
            <h1 id="titulo-studio">{m.titulo}, {projeto.data.projeto.nome}</h1>
            <p className={estilos.micro}>{m.micro}</p>

            {arquivado ? (
              <div role="status" className={estilos.aviso}>
                <strong>{m.arquivado.titulo}</strong>
                <p>{m.arquivado.texto}</p>
              </div>
            ) : null}

            {pendentes.length > 0 ? (
              <div role="status" className={estilos.pendencias}>
                <strong>{m.pendencias.aviso(pendentes.length)}</strong>
                <p>{m.pendencias.texto}</p>
                <ul>
                  {pendentes.map((linha) => <li key={linha.chave}>{m.pendencias.linha(linha.nome, linha.pagina)}</li>)}
                </ul>
              </div>
            ) : null}

            <div className={estilos.acoes} role="status">
              {mudou ? <p className={estilos.naoSalvo}>{m.naoSalvo}</p> : null}
              {!mudou && design.data ? <p className={estilos.micro}>{m.salvo(design.data.versao)}</p> : null}
              {!design.data ? <p className={estilos.micro}>{m.semDocumento}</p> : null}

              <div className={estilos.botoes}>
                <Botao onClick={() => salvar.mutate(documento)} carregando={salvar.isPending} desabilitado={!podeSalvar}>
                  {salvar.isPending ? m.salvando : m.salvar}
                </Botao>
                <Botao variante="fantasma" onClick={() => despachar({ tipo: 'descartar', documento: salvo })} desabilitado={!mudou}>
                  {m.descartar}
                </Botao>
                <Botao
                  variante="fantasma"
                  onClick={() => despachar({ tipo: 'desfazer' })}
                  desabilitado={rotuloDeDesfazer(estado) === null}
                  aria-label={rotuloDeDesfazer(estado) ? m.historico.desfazerCom(rotuloDeDesfazer(estado)) : m.historico.nadaParaDesfazer}
                >
                  {m.historico.desfazer}
                </Botao>
                <Botao
                  variante="fantasma"
                  onClick={() => despachar({ tipo: 'refazer' })}
                  desabilitado={rotuloDeRefazer(estado) === null}
                  aria-label={rotuloDeRefazer(estado) ? m.historico.refazerCom(rotuloDeRefazer(estado)) : m.historico.nadaParaRefazer}
                >
                  {m.historico.refazer}
                </Botao>
              </div>

              {mudou && pendentes.length > 0 ? <p className={estilos.naoSalvo}>{m.pendencias.naoSalva}</p> : null}
              {erroSalvar ? (
                <ul role="alert" className={estilos.erroSalvar}>
                  {erroSalvar.map((issue, indice) => <li key={issue.caminho ?? indice}>{issue.mensagem}</li>)}
                </ul>
              ) : null}
            </div>
          </header>
        )}
        esquerda={(
          <>
            <PainelCamadas
              linhas={linhas}
              selecao={estado.selecao}
              somenteLeitura={arquivado}
              onSelecionar={(linha) => despachar({ tipo: 'selecionar', pagina: linha.pagina, no: linha.escopo === 'no' ? linha.id : null })}
              onNovaPagina={() => despachar({ tipo: 'adicionarPagina', nome: nomeDaNovaPagina })}
              onMover={(linha, direcao) => despachar({ tipo: 'moverNo', id: linha.id, direcao })}
              onRemover={(linha) => despachar(linha.escopo === 'pagina' ? { tipo: 'removerPagina', id: linha.id } : { tipo: 'removerNo', id: linha.id })}
              podeMover={(linha, direcao) => linha.escopo === 'no' && podeMover(itens, documento, linha.id, direcao)}
            />
            <PaletaItens
              itens={oferecidos}
              temPagina={Boolean(paginaAtual)}
              nomeDaSelecao={nomeDaSelecao}
              somenteLeitura={arquivado}
              onAdicionar={(item) => despachar({ tipo: 'adicionarNo', item: item.id })}
            />
          </>
        )}
        centro={(
          <CanvasStudio
            pagina={paginaAtual}
            itens={itens}
            tokens={documento.tokens}
            selecao={estado.selecao}
            onSelecionar={(idNo) => despachar({ tipo: 'selecionar', pagina: estado.selecao.pagina, no: idNo })}
            vista={vista}
            onTrocarVista={setVista}
            zoom={zoom}
            onTrocarZoom={setZoom}
            amostra={<PreviewProjeto tokens={documento.tokens} />}
          />
        )}
        direita={(
          <>
            <PainelPropriedades
              selecionado={selecionado}
              paginas={documento.paginas}
              somenteLeitura={arquivado}
              onTrocarCampoDaPagina={(campo, valor) => despachar({ tipo: 'trocarCampoDaPagina', id: estado.selecao.pagina, campo, valor })}
              onTrocarProp={(prop, valor) => despachar({ tipo: 'trocarProp', id: estado.selecao.no, prop: prop.id, valor, rotulo: prop.rotulo })}
              onRemover={() => despachar({ tipo: 'removerNo', id: estado.selecao.no })}
            />
            <PainelTokens
              tokens={documento.tokens}
              somenteLeitura={arquivado}
              onTrocar={(caminho, valor) => despachar({ tipo: 'trocarToken', caminho, valor })}
              onRestaurarGrupo={(grupo) => despachar({ tipo: 'restaurarGrupo', grupo })}
              onRestaurarTudo={() => despachar({ tipo: 'restaurarTokens' })}
            />
          </>
        )}
      />
    </section>
  );
}
