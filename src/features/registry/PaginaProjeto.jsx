import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { obterProjeto, atualizarProjeto, listarVersoesBlueprint } from '../../services/projetos.js';
import { obterPreset } from '../../services/presets.js';
import { listarRegras } from '../../services/regras.js';
import Botao from '../../components/shared/Botao/Botao.jsx';
import Campo from '../../components/shared/Campo/Campo.jsx';
import Chave from '../../components/shared/Chave/Chave.jsx';
import Selo from '../../components/shared/Selo/Selo.jsx';
import { ESTADO_SELO_POR_STATUS } from '../../components/registry/CartaoProjeto/CartaoProjeto.jsx';
import { formatarData } from '../../utils/formatarData.js';
import { mensagens } from '../../mensagens.js';
import estilos from './PaginaProjeto.module.css';

const m = mensagens.projeto;

export default function PaginaProjeto() {
  const { id } = useParams();
  const clienteQuery = useQueryClient();
  const consulta = useQuery({ queryKey: ['projeto', id], queryFn: () => obterProjeto(id) });
  const versoes = useQuery({ queryKey: ['projeto', id, 'versoes'], queryFn: () => listarVersoesBlueprint(id), enabled: Boolean(consulta.data) });
  const preset = useQuery({ queryKey: ['preset', consulta.data?.projeto.presetId], queryFn: () => obterPreset(consulta.data.projeto.presetId), enabled: Boolean(consulta.data) });
  const regras = useQuery({ queryKey: ['regras', id], queryFn: () => listarRegras(id), enabled: Boolean(consulta.data) });
  const [editando, setEditando] = useState(false);
  const [nomeNovo, setNomeNovo] = useState('');

  const atualizar = useMutation({
    mutationFn: (patch) => atualizarProjeto(id, patch),
    onSuccess: (dados) => {
      clienteQuery.setQueryData(['projeto', id], dados);
      clienteQuery.invalidateQueries({ queryKey: ['projetos'] });
      setEditando(false);
    },
  });

  if (consulta.isPending) return <p role="status" className={estilos.estado}>{mensagens.estados.carregando}</p>;

  if (consulta.isError) {
    const naoEncontrado = consulta.error?.codigo === 'FORGE_NOT_FOUND';
    return (
      <div role="alert" className={estilos.erro}>
        <p>{naoEncontrado ? m.naoEncontrado : (consulta.error?.message ?? mensagens.estados.erroGenerico)}</p>
        {naoEncontrado ? <Link to="/">{m.voltar}</Link> : <Botao variante="secundario" onClick={() => consulta.refetch()}>{mensagens.estados.tentarDeNovo}</Botao>}
      </div>
    );
  }

  const { projeto, blueprint } = consulta.data;
  const etapasDoPreset = preset.data?.etapas ?? [];
  const arquivado = projeto.status === 'arquivado';
  const erroNome = atualizar.isError ? (atualizar.error?.detalhe?.issues?.find((i) => i.caminho === 'nome')?.mensagem ?? null) : null;
  const erroGeral = atualizar.isError && !erroNome ? (atualizar.error?.message ?? mensagens.estados.erroGenerico) : null;

  const salvarNome = (evento) => {
    evento.preventDefault();
    atualizar.mutate({ nome: nomeNovo.trim() });
  };

  return (
    <section className={estilos.pagina} aria-labelledby="titulo-projeto">
      <p className={estilos.voltar}><Link to="/">{m.voltar}</Link></p>

      <div className={estilos.cabecalho}>
        {editando ? (
          <form className={estilos.formNome} onSubmit={salvarNome} noValidate>
            <Campo id="nome" rotulo={m.nome.rotulo} microtexto={m.nome.micro} erro={erroNome} value={nomeNovo} onChange={(evento) => setNomeNovo(evento.target.value)} autoComplete="off" maxLength={80} />
            <div className={estilos.acoes}>
              <Botao tipo="submit" carregando={atualizar.isPending}>{m.salvarNome}</Botao>
              <Botao variante="fantasma" onClick={() => setEditando(false)}>{m.cancelar}</Botao>
            </div>
          </form>
        ) : (
          <div className={estilos.titulo}>
            <h1 id="titulo-projeto">{projeto.nome}</h1>
            <Selo estado={ESTADO_SELO_POR_STATUS[projeto.status]} />
          </div>
        )}
        <div className={estilos.acoes}>
          {!editando && !arquivado ? <Botao variante="secundario" onClick={() => { setNomeNovo(projeto.nome); setEditando(true); }}>{m.renomear}</Botao> : null}
          {arquivado
            ? <Botao variante="secundario" carregando={atualizar.isPending} onClick={() => atualizar.mutate({ arquivado: false })}>{m.restaurar}</Botao>
            : <Botao variante="fantasma" carregando={atualizar.isPending} onClick={() => atualizar.mutate({ arquivado: true })}>{m.arquivar}</Botao>}
        </div>
      </div>

      {erroGeral ? <p role="alert" className={estilos.erroTexto}>{erroGeral}</p> : null}
      {arquivado ? <p role="note" className={estilos.aviso}>{m.arquivado}</p> : null}

      <dl className={estilos.dados}>
        <div><dt>{m.preset}</dt><dd>{projeto.presetNome} <span className={estilos.mono}>v{projeto.presetVersao}</span></dd></div>
        <div><dt>{m.etapaAtual}</dt><dd>{mensagens.etapas[blueprint.payload.etapaAtual]}</dd></div>
        <div><dt>{m.caminho}</dt><dd>{projeto.caminhoDisco ? <Chave valor={projeto.caminhoDisco} rotulo={m.caminho} /> : <span className={estilos.estado}>{m.semCaminho}</span>}</dd></div>
        <div><dt>{m.blueprintVersao}</dt><dd><span className={estilos.mono}>v{blueprint.versao}</span> · {formatarData(blueprint.criadoEm)}</dd></div>
      </dl>

      {!arquivado ? (
        <p className={estilos.progresso}>
          <Link to={`/projetos/${projeto.id}/wizard`} className={estilos.acaoPrimaria}>
            {blueprint.payload.etapasConcluidas.length + blueprint.payload.assumidas.length > 0 ? m.continuar : m.comecar}
          </Link>
          <span className={estilos.estado}>{m.progresso(blueprint.payload.etapasConcluidas.length + blueprint.payload.assumidas.length, etapasDoPreset.length)}</span>
          <span className={regras.data?.bloqueios ? estilos.erroTexto : estilos.estado}>
            {regras.data ? (regras.data.bloqueios > 0 ? mensagens.regras.bloqueiosAbertos(regras.data.bloqueios) : mensagens.regras.semBloqueios) : ''}
          </span>
        </p>
      ) : null}

      <p className={estilos.progresso}>
        <Link to={`/projetos/${projeto.id}/studio`}>{mensagens.studio.abrir}</Link>
        <span className={estilos.estado}>{mensagens.studio.micro}</span>
      </p>

      <section aria-labelledby="titulo-versoes" className={estilos.versoes}>
        <h2 id="titulo-versoes">{m.versoes}</h2>
        {versoes.data ? (
          <ol className={estilos.listaVersoes}>
            {versoes.data.map((versao) => (
              <li key={versao.versao}>
                <span className={estilos.mono}>v{versao.versao}</span> · {formatarData(versao.criadoEm)}
                {versao.ativo ? <Selo estado="ativa">{m.versaoAtiva}</Selo> : null}
              </li>
            ))}
          </ol>
        ) : <p role="status" className={estilos.estado}>{mensagens.estados.carregando}</p>}
      </section>
    </section>
  );
}
