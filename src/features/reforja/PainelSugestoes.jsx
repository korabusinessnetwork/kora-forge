import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { criarMelhoria, obterEstadoSugestoes, pedirSugestoes } from '../../services/reforja.js';
import Botao from '../../components/shared/Botao/Botao.jsx';
import { mensagens } from '../../mensagens.js';
import estilos from './PainelSugestoes.module.css';

const m = mensagens.reforja;

// Enfeite, nunca engrenagem. Indisponível, a ação fica desabilitada com o motivo e o caminho para
// Configurações; disponível, cada proposta espera o clique do dono para virar melhoria.
export default function PainelSugestoes() {
  const cliente = useQueryClient();
  const [resposta, setResposta] = useState(null);
  const [pendentes, setPendentes] = useState([]);
  const [aviso, setAviso] = useState(null);

  const estado = useQuery({ queryKey: ['reforja', 'sugestoes', 'estado'], queryFn: () => obterEstadoSugestoes() });

  const pedir = useMutation({
    mutationFn: () => pedirSugestoes(),
    onSuccess: (resultado) => {
      setResposta(resultado);
      setPendentes(resultado.propostas.map((proposta, indice) => ({ ...proposta, chave: `${indice}-${proposta.titulo}` })));
      setAviso(null);
    },
  });

  const aceitar = useMutation({
    mutationFn: (proposta) => criarMelhoria({ titulo: proposta.titulo, descricao: proposta.descricao, origem: 'modelo' }),
    onSuccess: (item, proposta) => {
      setPendentes((lista) => lista.filter((outra) => outra.chave !== proposta.chave));
      setAviso(m.sugestoes.aceita(item.titulo));
      cliente.invalidateQueries({ queryKey: ['reforja', 'itens'] });
    },
  });

  const dispensar = (chave) => setPendentes((lista) => lista.filter((proposta) => proposta.chave !== chave));
  const disponivel = estado.data?.disponivel === true;
  const motivo = estado.data?.motivo;

  return (
    <section className={estilos.painel} aria-labelledby="titulo-sugestoes">
      <header className={estilos.cabecalho}>
        <h2 id="titulo-sugestoes" className={estilos.titulo}>{m.sugestoes.titulo}</h2>
        <p className={estilos.descricao}>{m.sugestoes.descricao}</p>
      </header>

      {estado.isPending ? <p role="status" className={estilos.descricao}>{mensagens.estados.carregando}</p> : null}

      {estado.isError ? (
        <div role="alert" className={estilos.erro}>
          <p>{estado.error?.message ?? mensagens.estados.erroGenerico}</p>
          <Botao variante="secundario" onClick={() => estado.refetch()}>{mensagens.estados.tentarDeNovo}</Botao>
        </div>
      ) : null}

      {estado.data ? (
        <div className={estilos.acao}>
          <Botao variante="secundario" desabilitado={!disponivel} carregando={pedir.isPending} onClick={() => pedir.mutate()} aria-describedby={disponivel ? undefined : 'sugestoes-motivo'}>
            {pedir.isPending ? m.sugestoes.pedindo : m.sugestoes.pedir}
          </Botao>
          {!disponivel ? (
            <p id="sugestoes-motivo" className={estilos.motivo}>
              {m.sugestoes.indisponivel[motivo] ?? m.sugestoes.indisponivel.desconectado}{' '}
              <Link to="/config" className={estilos.link}>{m.sugestoes.irConfiguracoes}</Link>
            </p>
          ) : null}
        </div>
      ) : null}

      {pedir.isError ? (
        <p role="alert" className={estilos.falha}>
          {pedir.error?.message ?? mensagens.estados.erroGenerico}{' '}
          <Link to="/config" className={estilos.link}>{m.sugestoes.irConfiguracoes}</Link>
        </p>
      ) : null}
      {aceitar.isError ? <p role="alert" className={estilos.falha}>{aceitar.error?.message ?? mensagens.estados.erroGenerico}</p> : null}
      {aviso ? <p role="status" className={estilos.sucesso}>{aviso}</p> : null}

      {resposta ? (
        <div className={estilos.resultado}>
          {resposta.modelo ? <p className={estilos.detalhe}>{m.sugestoes.doModelo(resposta.modelo)}</p> : null}
          {resposta.propostas.length === 0 ? (
            <p role="status" className={estilos.detalhe}>{resposta.formatoReconhecido ? m.sugestoes.semPropostas : m.sugestoes.formatoNaoReconhecido}</p>
          ) : null}
          {resposta.descartadas > 0 ? <p className={estilos.detalhe}>{m.sugestoes.descartadas(resposta.descartadas)}</p> : null}
          {resposta.propostas.length > 0 && pendentes.length === 0 ? <p className={estilos.detalhe}>{m.sugestoes.todasResolvidas}</p> : null}

          <ul className={estilos.lista}>
            {pendentes.map((proposta) => (
              <li key={proposta.chave} className={estilos.proposta}>
                <p className={estilos.tituloProposta}>{proposta.titulo}</p>
                {proposta.descricao ? <p className={estilos.detalhe}>{proposta.descricao}</p> : null}
                <div className={estilos.botoes}>
                  <Botao
                    variante="primario"
                    carregando={aceitar.isPending && aceitar.variables?.chave === proposta.chave}
                    desabilitado={aceitar.isPending}
                    onClick={() => aceitar.mutate(proposta)}
                  >
                    {m.sugestoes.aceitar}
                  </Botao>
                  <Botao variante="fantasma" desabilitado={aceitar.isPending} onClick={() => dispensar(proposta.chave)}>
                    {m.sugestoes.dispensar}
                  </Botao>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
