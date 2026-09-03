import Selo from '../../shared/Selo/Selo.jsx';
import { formatarBytes } from '../../../utils/formatarBytes.js';
import { mensagens } from '../../../mensagens.js';
import estilos from './LinhaPlano.module.css';

const ESTADO_POR_ACAO = { criar: 'pronto', sobrescrever: 'invalida', pular: 'arquivado' };

// Molecule. Um arquivo do dry-run: caminho, ação, tamanho e de qual template ele veio.
export default function LinhaPlano({ arquivo }) {
  const m = mensagens.plano;
  return (
    <li className={[estilos.linha, estilos[arquivo.acao]].join(' ')}>
      <code className={estilos.caminho}>{arquivo.caminho}</code>
      <Selo estado={ESTADO_POR_ACAO[arquivo.acao]}>{m.acao[arquivo.acao]}</Selo>
      <span className={estilos.tamanho}>
        {formatarBytes(arquivo.tamanho)}
        {arquivo.acao === 'sobrescrever' ? ` ${m.substitui(formatarBytes(arquivo.tamanhoAtual ?? 0))}` : ''}
      </span>
      <span className={estilos.template}>{arquivo.template}</span>
    </li>
  );
}
