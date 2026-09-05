import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentoDesignSchema } from '@shared/schemas/design.js';
import { saoIguais } from '@shared/serializar.js';
import { obterProjeto } from '../../services/projetos.js';
import { obterDesign, salvarDesign } from '../../services/design.js';
import Botao from '../../components/shared/Botao/Botao.jsx';
import PainelTokens from '../../components/studio/PainelTokens/PainelTokens.jsx';
import PreviewProjeto from '../../components/studio/PreviewProjeto/PreviewProjeto.jsx';
import { trocarToken, restaurarGrupo } from './campos.js';
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

  // Rascunho local: o preview muda enquanto se digita, sem requisição nenhuma. `null` quer dizer
  // "ainda não mexi", e aí o que vale é o que veio da API.
  const [rascunho, setRascunho] = useState(null);

  const salvar = useMutation({
    mutationFn: (documento) => salvarDesign(id, documento),
    onSuccess: (salvo) => {
      clienteQuery.setQueryData(['design', id], salvo);
      setRascunho(null);
    },
  });

  if (projeto.isPending || design.isPending) return <p role="status" className={estilos.estado}>{mensagens.estados.carregando}</p>;

  if (projeto.isError || design.isError) {
    const erro = projeto.error ?? design.error;
    const naoEncontrado = erro?.codigo === 'FORGE_NOT_FOUND';
    return (
      <div role="alert" className={estilos.erro}>
        <p>{naoEncontrado ? m.naoEncontrado : (erro?.message ?? m.erroCarregar)}</p>
        {naoEncontrado
          ? <Link to="/">{mensagens.projeto.voltar}</Link>
          : <Botao variante="secundario" onClick={() => { projeto.refetch(); design.refetch(); }}>{mensagens.estados.tentarDeNovo}</Botao>}
      </div>
    );
  }

  const salvo = design.data?.payload ?? DOCUMENTO_PADRAO;
  const documento = rascunho ?? salvo;
  const arquivado = projeto.data.projeto.status === 'arquivado';
  const mudou = !saoIguais(documento, salvo);
  const erroSalvar = salvar.isError ? (salvar.error?.message ?? m.erroSalvar) : null;

  const trocar = (caminho, valor) => setRascunho({ ...documento, tokens: trocarToken(documento.tokens, caminho, valor) });
  const restaurar = (grupo) => setRascunho({ ...documento, tokens: restaurarGrupo(documento.tokens, grupo) });
  const restaurarTudo = () => setRascunho({ ...documento, tokens: DOCUMENTO_PADRAO.tokens });

  return (
    <section className={estilos.pagina} aria-labelledby="titulo-studio">
      <header className={estilos.cabecalho}>
        <p className={estilos.voltar}><Link to={`/projetos/${id}`}>{m.voltar}</Link></p>
        <h1 id="titulo-studio">{m.titulo}, {projeto.data.projeto.nome}</h1>
        <p className={estilos.micro}>{m.micro}</p>
      </header>

      {arquivado ? (
        <div role="status" className={estilos.aviso}>
          <strong>{m.arquivado.titulo}</strong>
          <p>{m.arquivado.texto}</p>
        </div>
      ) : null}

      <div className={estilos.colunas}>
        <div className={estilos.centro}>
          <h2 className={estilos.tituloColuna}>{m.preview.titulo}</h2>
          <p className={estilos.micro}>{m.preview.micro}</p>
          <div className={estilos.moldura}>
            <PreviewProjeto tokens={documento.tokens} />
          </div>
        </div>

        <aside className={estilos.lateral} aria-label={m.titulo}>
          <div className={estilos.acoes} role="status">
            {mudou ? <p className={estilos.naoSalvo}>{m.naoSalvo}</p> : null}
            {!mudou && design.data ? <p className={estilos.micro}>{m.salvo(design.data.versao)}</p> : null}
            {!design.data ? <p className={estilos.micro}>{m.semDocumento}</p> : null}
            <div className={estilos.botoes}>
              <Botao
                onClick={() => salvar.mutate(documento)}
                carregando={salvar.isPending}
                desabilitado={!mudou || arquivado}
              >
                {salvar.isPending ? m.salvando : m.salvar}
              </Botao>
              <Botao variante="fantasma" onClick={() => setRascunho(null)} desabilitado={!mudou}>{m.descartar}</Botao>
            </div>
            {erroSalvar ? (
              <p role="alert" className={estilos.erroSalvar}>{erroSalvar}</p>
            ) : null}
          </div>

          <PainelTokens
            tokens={documento.tokens}
            onTrocar={trocar}
            onRestaurarGrupo={restaurar}
            onRestaurarTudo={restaurarTudo}
            somenteLeitura={arquivado}
          />
        </aside>
      </div>
    </section>
  );
}
