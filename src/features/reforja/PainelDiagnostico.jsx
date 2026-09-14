import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { obterDiagnostico, transformarSinalEmMelhoria } from '../../services/reforja.js';
import Botao from '../../components/shared/Botao/Botao.jsx';
import { mensagens } from '../../mensagens.js';
import CartaoSinal from './CartaoSinal.jsx';
import estilos from './PainelDiagnostico.module.css';

const m = mensagens.reforja;

// Diagnóstico só leitura. `sinaisNoBacklog` é o conjunto de ids de sinal que já têm item aberto,
// calculado pela página a partir do backlog, para o botão não prometer um item que não vai nascer.
export default function PainelDiagnostico({ sinaisNoBacklog }) {
  const cliente = useQueryClient();
  const [aviso, setAviso] = useState(null);
  const consulta = useQuery({ queryKey: ['reforja', 'diagnostico'], queryFn: () => obterDiagnostico() });

  const transformar = useMutation({
    mutationFn: (sinalId) => transformarSinalEmMelhoria(sinalId),
    onSuccess: ({ item, criado }) => {
      setAviso(criado ? m.diagnostico.transformado(item.titulo) : m.diagnostico.jaExistia(item.titulo));
      cliente.invalidateQueries({ queryKey: ['reforja', 'itens'] });
    },
  });

  const dados = consulta.data;

  return (
    <section className={estilos.painel} aria-labelledby="titulo-diagnostico">
      <header className={estilos.cabecalho}>
        <div className={estilos.textos}>
          <h2 id="titulo-diagnostico" className={estilos.titulo}>{m.diagnostico.titulo}</h2>
          <p className={estilos.descricao}>{m.diagnostico.descricao}</p>
        </div>
        <Botao variante="fantasma" carregando={consulta.isFetching && !consulta.isPending} desabilitado={consulta.isPending} onClick={() => consulta.refetch()}>
          {m.diagnostico.atualizar}
        </Botao>
      </header>

      {consulta.isPending ? <p role="status" className={estilos.estado}>{mensagens.estados.carregando}</p> : null}

      {consulta.isError ? (
        <div role="alert" className={estilos.erro}>
          <p>{consulta.error?.message ?? mensagens.estados.erroGenerico}</p>
          <Botao variante="secundario" onClick={() => consulta.refetch()}>{mensagens.estados.tentarDeNovo}</Botao>
        </div>
      ) : null}

      {aviso ? <p role="status" className={estilos.sucesso}>{aviso}</p> : null}
      {transformar.isError ? <p role="alert" className={estilos.falha}>{transformar.error?.message ?? mensagens.estados.erroGenerico}</p> : null}

      {dados && dados.sinais.length === 0 ? (
        <div className={estilos.vazio}>
          <p className={estilos.vazioTitulo}>{m.diagnostico.vazioTitulo}</p>
          <p>{m.diagnostico.vazioAcao}</p>
        </div>
      ) : null}

      {dados && dados.sinais.length > 0 ? (
        <>
          <p className={estilos.resumo}>{m.diagnostico.resumo(dados.resumo.total, dados.arquivosLidos)}</p>
          <div className={estilos.lista}>
            {dados.sinais.map((sinal) => (
              <CartaoSinal
                key={sinal.id}
                sinal={sinal}
                jaNoBacklog={sinaisNoBacklog.has(sinal.id)}
                transformando={transformar.isPending && transformar.variables === sinal.id}
                onTransformar={(sinalId) => transformar.mutate(sinalId)}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
