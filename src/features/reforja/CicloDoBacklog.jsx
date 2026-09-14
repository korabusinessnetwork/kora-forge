import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CICLO } from '@shared/reforja/estados.js';
import { mudarEstadoDaMelhoria } from '../../services/reforja.js';
import Botao from '../../components/shared/Botao/Botao.jsx';
import { mensagens } from '../../mensagens.js';
import CartaoItem from './CartaoItem.jsx';
import PreviaSpec from './PreviaSpec.jsx';
import estilos from './CicloDoBacklog.module.css';

const m = mensagens.reforja;

// O backlog como trilho do harness: cinco colunas do ciclo, cada uma com contagem e o próximo passo
// em linguagem humana. Descartadas ficam num grupo recolhido, fora do trilho.
export default function CicloDoBacklog({ consulta }) {
  const cliente = useQueryClient();
  const [aviso, setAviso] = useState(null);
  const [itemEmPrevia, setItemEmPrevia] = useState(null);

  const mudar = useMutation({
    mutationFn: ({ item, para }) => mudarEstadoDaMelhoria(item.id, para),
    onSuccess: (item) => {
      setAviso(m.backlog.estadoMudou(item.titulo, m.backlog.estados[item.estado].toLowerCase()));
      cliente.invalidateQueries({ queryKey: ['reforja', 'itens'] });
    },
  });

  const dados = consulta.data;
  const itens = dados?.itens ?? [];
  const descartadas = itens.filter((item) => item.estado === 'descartada');
  const ocupado = (item) => mudar.isPending && mudar.variables?.item.id === item.id;

  const props = (item) => ({
    item,
    ocupado: ocupado(item),
    onMudarEstado: (alvo, para) => {
      setAviso(null);
      mudar.mutate({ item: alvo, para });
    },
    onGerarSpec: (alvo) => {
      setAviso(null);
      setItemEmPrevia(alvo);
    },
  });

  return (
    <section className={estilos.painel} aria-labelledby="titulo-backlog">
      <header className={estilos.cabecalho}>
        <h2 id="titulo-backlog" className={estilos.titulo}>{m.backlog.titulo}</h2>
        <p className={estilos.descricao}>{m.backlog.descricao}</p>
      </header>

      {consulta.isPending ? <p role="status" className={estilos.descricao}>{mensagens.estados.carregando}</p> : null}

      {consulta.isError ? (
        <div role="alert" className={estilos.erro}>
          <p>{consulta.error?.message ?? mensagens.estados.erroGenerico}</p>
          <Botao variante="secundario" onClick={() => consulta.refetch()}>{mensagens.estados.tentarDeNovo}</Botao>
        </div>
      ) : null}

      {aviso ? <p role="status" className={estilos.sucesso}>{aviso}</p> : null}
      {mudar.isError ? <p role="alert" className={estilos.falha}>{mudar.error?.message ?? mensagens.estados.erroGenerico}</p> : null}

      {itemEmPrevia ? (
        <PreviaSpec
          key={itemEmPrevia.id}
          item={itemEmPrevia}
          onFechar={() => setItemEmPrevia(null)}
          onGravada={(mensagem) => {
            setItemEmPrevia(null);
            setAviso(mensagem);
          }}
        />
      ) : null}

      {dados && itens.length === 0 ? (
        <div className={estilos.vazio}>
          <p className={estilos.vazioTitulo}>{m.backlog.vazioTitulo}</p>
          <p>{m.backlog.vazioAcao}</p>
        </div>
      ) : null}

      {dados && itens.length > 0 ? (
        <>
          <ol className={estilos.trilho}>
            {CICLO.map((estado) => {
              const daColuna = itens.filter((item) => item.estado === estado);
              const idColuna = `coluna-${estado}`;
              return (
                <li key={estado} className={estilos.coluna} aria-labelledby={idColuna} data-coluna={estado}>
                  <div className={estilos.topoColuna}>
                    <h3 id={idColuna} className={estilos.nomeColuna}>
                      {m.backlog.estados[estado]} <span className={estilos.contagem}>{dados.contagem[estado]}</span>
                    </h3>
                    <p className={estilos.depois}>{m.backlog.depois[estado]}</p>
                  </div>
                  {daColuna.length === 0 ? <p className={estilos.colunaVazia}>{m.backlog.colunaVazia}</p> : null}
                  {daColuna.map((item) => <CartaoItem key={item.id} {...props(item)} />)}
                </li>
              );
            })}
          </ol>

          <details className={estilos.descartadas}>
            <summary>{m.backlog.descartadas(dados.contagem.descartada)}</summary>
            <p className={estilos.depois}>{m.backlog.depois.descartada}</p>
            {descartadas.length === 0 ? <p className={estilos.colunaVazia}>{m.backlog.descartadasVazio}</p> : null}
            <div className={estilos.listaDescartadas}>
              {descartadas.map((item) => <CartaoItem key={item.id} {...props(item)} />)}
            </div>
          </details>
        </>
      ) : null}
    </section>
  );
}
