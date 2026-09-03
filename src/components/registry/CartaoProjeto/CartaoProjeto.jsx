import { Link } from 'react-router-dom';
import Selo from '../../shared/Selo/Selo.jsx';
import { formatarData } from '../../../utils/formatarData.js';
import { mensagens } from '../../../mensagens.js';
import estilos from './CartaoProjeto.module.css';

export const ESTADO_SELO_POR_STATUS = {
  rascunho: 'rascunho',
  pronto_para_materializar: 'pronto',
  materializado: 'materializado',
  arquivado: 'arquivado',
};

// Molecule. Nome, preset, status, caminho, última alteração. Abre o projeto.
export default function CartaoProjeto({ projeto }) {
  const m = mensagens.registry;
  return (
    <Link to={`/projetos/${projeto.id}`} className={estilos.cartao}>
      <span className={estilos.topo}>
        <span className={estilos.nome}>{projeto.nome}</span>
        <Selo estado={ESTADO_SELO_POR_STATUS[projeto.status]} />
      </span>
      <span className={estilos.meta}>
        {projeto.presetNome} · {m.etapa}: {mensagens.etapas[projeto.etapaAtual] ?? projeto.etapaAtual ?? ''}
      </span>
      <code className={estilos.caminho}>{projeto.caminhoDisco ?? m.semCaminho}</code>
      <span className={estilos.data}>{m.ultimaAlteracao} {formatarData(projeto.atualizadoEm)}</span>
    </Link>
  );
}
