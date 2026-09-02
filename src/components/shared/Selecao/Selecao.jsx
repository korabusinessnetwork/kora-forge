import { mensagens } from '../../../mensagens.js';
import estilos from './Selecao.module.css';

// Atom. A opção marcada como padrão Kora vem sempre primeiro, com selo no rótulo.
export default function Selecao({ id, opcoes, valor, onChange, className, ...resto }) {
  const ordenadas = [...opcoes].sort((a, b) => Number(Boolean(b.padraoKora)) - Number(Boolean(a.padraoKora)));
  return (
    <select id={id} className={[estilos.selecao, className].filter(Boolean).join(' ')} value={valor} onChange={(evento) => onChange?.(evento.target.value)} {...resto}>
      {ordenadas.map((opcao) => (
        <option key={opcao.valor} value={opcao.valor}>
          {opcao.padraoKora ? `${opcao.rotulo} · ${mensagens.selecao.padraoKora}` : opcao.rotulo}
        </option>
      ))}
    </select>
  );
}
