import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { gerarPlano } from '../../../services/plano.js';
import Botao from '../../../components/shared/Botao/Botao.jsx';
import CampoBooleano from '../../../components/shared/CampoBooleano/CampoBooleano.jsx';
import PainelPlano from '../../../components/plano/PainelPlano/PainelPlano.jsx';
import { mensagens } from '../../../mensagens.js';
import estilos from './Fundacao.module.css';

const m = mensagens.wizard.passos.materializar;

export default function Materializar({ valor, onChange, projeto }) {
  const plano = useQuery({ queryKey: ['plano', projeto.id], queryFn: () => gerarPlano(projeto.id), retry: false });
  const faltaWorkspace = plano.error?.detalhe?.issues?.[0]?.caminho === 'workspace';

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

      <p className={estilos.texto} role="note">{mensagens.plano.execucaoIndisponivel}</p>
      <CampoBooleano id="confirmada" rotulo={m.confirmada.rotulo} microtexto={m.confirmada.micro} valor={valor.confirmada} padrao={false} onChange={(novo) => onChange({ ...valor, confirmada: novo })} />
    </>
  );
}
