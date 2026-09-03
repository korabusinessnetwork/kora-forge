import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { gerarPlano } from '../../../services/plano.js';
import { materializar, obterMaterializacao, decidirMaterializacao, pararRun } from '../../../services/materializacao.js';
import { useLogDoRun } from '../../../hooks/useLogDoRun.js';
import Botao from '../../../components/shared/Botao/Botao.jsx';
import CampoBooleano from '../../../components/shared/CampoBooleano/CampoBooleano.jsx';
import PainelPlano from '../../../components/plano/PainelPlano/PainelPlano.jsx';
import PainelMaterializacao from '../../../components/plano/PainelMaterializacao/PainelMaterializacao.jsx';
import PainelLog from '../../../components/plano/PainelLog/PainelLog.jsx';
import TelaFinal from '../../../components/plano/TelaFinal/TelaFinal.jsx';
import { mensagens } from '../../../mensagens.js';
import estilos from './Fundacao.module.css';

const m = mensagens.wizard.passos.materializar;
const mm = mensagens.materializacao;
const EM_ANDAMENTO = ['escrevendo', 'rodando'];
const TERMINADA = ['concluida', 'abortada'];

// Qual comando o log acompanha quando ninguém escolheu: o que está rodando agora, e não havendo
// nenhum, o último que já rodou. O usuário não deveria precisar clicar para ver o que acontece.
export function runIdEmFoco(materializacao) {
  if (!materializacao) return null;
  const comandos = materializacao.comandos ?? [];
  const rodando = comandos.find((comando) => comando.estado === 'rodando' && comando.runId);
  if (rodando) return rodando.runId;
  const comRun = comandos.filter((comando) => comando.runId);
  return comRun.length > 0 ? comRun[comRun.length - 1].runId : null;
}

export default function Materializar({ valor, onChange, projeto }) {
  const clienteQuery = useQueryClient();
  // Seleção manual do comando cujo log está na tela. `null` significa "siga o que está rodando";
  // uma escolha explícita é respeitada e não é atropelada pelo avanço da fila.
  const [runEscolhido, setRunEscolhido] = useState(null);
  const [tentativaDeLog, setTentativaDeLog] = useState(0);

  const plano = useQuery({ queryKey: ['plano', projeto.id], queryFn: () => gerarPlano(projeto.id), retry: false });
  const materializacao = useQuery({
    queryKey: ['materializacao', projeto.id],
    queryFn: () => obterMaterializacao(projeto.id),
    retry: false,
    // Enquanto está rodando, o estado muda sozinho. O log linha a linha chega pelo WebSocket.
    refetchInterval: (consulta) => (EM_ANDAMENTO.includes(consulta.state.data?.estado) ? 1000 : false),
  });

  const atualizar = (dados) => clienteQuery.setQueryData(['materializacao', projeto.id], dados);
  const aprovar = useMutation({ mutationFn: () => materializar(projeto.id, plano.data.hashBlueprint), onSuccess: atualizar });
  const decidir = useMutation({ mutationFn: (acao) => decidirMaterializacao(projeto.id, acao), onSuccess: atualizar });
  const parar = useMutation({
    mutationFn: pararRun,
    onSuccess: () => clienteQuery.invalidateQueries({ queryKey: ['materializacao', projeto.id] }),
  });

  const dados = materializacao.data ?? null;
  const runId = runEscolhido ?? runIdEmFoco(dados);
  // A tentativa entra na chave para "conectar de novo" refazer a assinatura do mesmo run.
  const log = useLogDoRun(runId ? `${runId}` : null, tentativaDeLog);
  // Sem run em foco não há comando em foco. Sem o `runId &&`, um `runId` nulo casaria com o
  // primeiro comando ainda pendente, que também tem `runId` nulo, e o log diria estar mostrando
  // a saída de um comando que nunca rodou.
  const comandoEmFoco = (runId && dados?.comandos.find((comando) => comando.runId === runId)) || null;

  const faltaWorkspace = plano.error?.detalhe?.issues?.[0]?.caminho === 'workspace';
  const ferramentas = aprovar.error?.detalhe?.ferramentas?.filter((ferramenta) => !ferramenta.ok) ?? [];
  const planoVelho = aprovar.error?.codigo === 'FORGE_PLAN_STALE';
  const emAndamento = dados && EM_ANDAMENTO.includes(dados.estado);
  const terminada = dados && TERMINADA.includes(dados.estado);

  return (
    <>
      {plano.isPending ? <p role="status" className={estilos.texto}>{mensagens.plano.carregando}</p> : null}

      {plano.isError ? (
        <div role="alert" className={estilos.erro}>
          <p>{plano.error?.message ?? mensagens.estados.erroGenerico}</p>
          {faltaWorkspace
            ? <Link to="/config">{mensagens.plano.erroWorkspace}</Link>
            : <Botao variante="secundario" onClick={() => plano.refetch()}>{mensagens.estados.tentarDeNovo}</Botao>}
        </div>
      ) : null}

      {terminada ? <TelaFinal materializacao={dados} projeto={projeto} /> : null}

      {plano.data && !terminada ? <PainelPlano plano={plano.data} /> : null}

      {dados ? (
        <>
          <PainelMaterializacao
            materializacao={dados}
            onDecidir={(acao) => decidir.mutate(acao)}
            onParar={(id) => parar.mutate(id)}
            decidindo={decidir.isPending}
            onSelecionar={setRunEscolhido}
            selecionado={runId}
          />
          <PainelLog
            comando={comandoEmFoco}
            eventos={log.eventos}
            descartados={log.descartados}
            estado={log.estado}
            onParar={(id) => parar.mutate(id)}
            onReconectar={() => setTentativaDeLog((n) => n + 1)}
          />
        </>
      ) : null}

      {aprovar.isError ? (
        <div role="alert" className={estilos.erro}>
          {ferramentas.length > 0 ? (
            <>
              <p>{mm.ferramentasAusentes}</p>
              <ul>
                {ferramentas.map((ferramenta) => (
                  <li key={ferramenta.bin}>{mm.ferramentaLinha(ferramenta.bin, ferramenta.min, ferramenta.encontrada)}</li>
                ))}
              </ul>
            </>
          ) : <p>{planoVelho ? mm.planoVelho : (aprovar.error?.message ?? mensagens.estados.erroGenerico)}</p>}
        </div>
      ) : null}

      {plano.data && !dados ? (
        <div className={estilos.aprovar}>
          <p className={estilos.texto}>{mm.aprovarMicro}</p>
          <Botao variante="primario" carregando={aprovar.isPending || emAndamento} onClick={() => aprovar.mutate()}>{mm.aprovar}</Botao>
        </div>
      ) : null}

      <CampoBooleano id="confirmada" rotulo={m.confirmada.rotulo} microtexto={m.confirmada.micro} valor={valor.confirmada} padrao={false} onChange={(novo) => onChange({ ...valor, confirmada: novo })} />
    </>
  );
}
