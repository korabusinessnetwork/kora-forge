import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { gerarPlano } from '../../../services/plano.js';
import { materializar, obterMaterializacao, decidirMaterializacao, pararRun } from '../../../services/materializacao.js';
import Botao from '../../../components/shared/Botao/Botao.jsx';
import CampoBooleano from '../../../components/shared/CampoBooleano/CampoBooleano.jsx';
import PainelPlano from '../../../components/plano/PainelPlano/PainelPlano.jsx';
import PainelMaterializacao from '../../../components/plano/PainelMaterializacao/PainelMaterializacao.jsx';
import { mensagens } from '../../../mensagens.js';
import estilos from './Fundacao.module.css';

const m = mensagens.wizard.passos.materializar;
const mm = mensagens.materializacao;
const EM_ANDAMENTO = ['escrevendo', 'rodando'];

export default function Materializar({ valor, onChange, projeto }) {
  const clienteQuery = useQueryClient();
  const plano = useQuery({ queryKey: ['plano', projeto.id], queryFn: () => gerarPlano(projeto.id), retry: false });
  const materializacao = useQuery({
    queryKey: ['materializacao', projeto.id],
    queryFn: () => obterMaterializacao(projeto.id),
    retry: false,
    // Enquanto está rodando, o estado muda sozinho. O log linha a linha chega no bloco 8.
    refetchInterval: (consulta) => (EM_ANDAMENTO.includes(consulta.state.data?.estado) ? 1000 : false),
  });

  const atualizar = (dados) => clienteQuery.setQueryData(['materializacao', projeto.id], dados);
  const aprovar = useMutation({ mutationFn: () => materializar(projeto.id, plano.data.hashBlueprint), onSuccess: atualizar });
  const decidir = useMutation({ mutationFn: (acao) => decidirMaterializacao(projeto.id, acao), onSuccess: atualizar });
  const parar = useMutation({
    mutationFn: pararRun,
    onSuccess: () => clienteQuery.invalidateQueries({ queryKey: ['materializacao', projeto.id] }),
  });

  const faltaWorkspace = plano.error?.detalhe?.issues?.[0]?.caminho === 'workspace';
  const ferramentas = aprovar.error?.detalhe?.ferramentas?.filter((ferramenta) => !ferramenta.ok) ?? [];
  const planoVelho = aprovar.error?.codigo === 'FORGE_PLAN_STALE';
  const emAndamento = materializacao.data && EM_ANDAMENTO.includes(materializacao.data.estado);

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

      {plano.data ? <PainelPlano plano={plano.data} /> : null}

      {materializacao.data ? (
        <PainelMaterializacao
          materializacao={materializacao.data}
          onDecidir={(acao) => decidir.mutate(acao)}
          onParar={(runId) => parar.mutate(runId)}
          decidindo={decidir.isPending}
        />
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

      {plano.data && !materializacao.data ? (
        <div className={estilos.aprovar}>
          <p className={estilos.texto}>{mm.aprovarMicro}</p>
          <Botao variante="primario" carregando={aprovar.isPending || emAndamento} onClick={() => aprovar.mutate()}>{mm.aprovar}</Botao>
        </div>
      ) : null}

      <CampoBooleano id="confirmada" rotulo={m.confirmada.rotulo} microtexto={m.confirmada.micro} valor={valor.confirmada} padrao={false} onChange={(novo) => onChange({ ...valor, confirmada: novo })} />
    </>
  );
}
