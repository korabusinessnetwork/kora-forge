import Campo from '../../../components/shared/Campo/Campo.jsx';
import { mensagens } from '../../../mensagens.js';
import estilos from './Fundacao.module.css';

const m = mensagens.wizard.passos.fundacao;

const ARQUIVOS_DA_FUNDACAO = [
  'CLAUDE.md',
  'README.md',
  'memory/ (identity, decisions, patterns, learnings, restrictions, bugs)',
  'docs/00_VISAO a docs/11_SEGURANCA',
  'docs/08_DECISOES/adr-001, com a stack escolhida',
];

// Revisão em leitura: o que a materialização vai escrever, o que foi assumido e o que falta.
export default function Fundacao({ valor, onChange, etapas, concluidas, assumidas }) {
  const pendentes = etapas.filter((etapa) => !concluidas.includes(etapa) && !assumidas.includes(etapa) && etapa !== 'fundacao' && etapa !== 'materializar');
  const nomes = (lista) => lista.map((etapa) => mensagens.etapas[etapa]).join(', ');
  return (
    <>
      <section className={estilos.bloco}>
        <h2 className={estilos.titulo}>{m.gerado}</h2>
        <ul className={estilos.lista}>
          {ARQUIVOS_DA_FUNDACAO.map((arquivo) => <li key={arquivo}><code className={estilos.mono}>{arquivo}</code></li>)}
        </ul>
      </section>
      <section className={estilos.bloco}>
        <h2 className={estilos.titulo}>{m.assumidas}</h2>
        <p className={estilos.texto}>{assumidas.length > 0 ? nomes(assumidas) : m.nenhumaAssumida}</p>
      </section>
      <section className={estilos.bloco}>
        <h2 className={estilos.titulo}>{m.pendentes}</h2>
        <p className={estilos.texto}>{pendentes.length > 0 ? nomes(pendentes) : m.nenhumaPendente}</p>
      </section>
      <Campo id="observacoes" rotulo={m.observacoes.rotulo} microtexto={m.observacoes.micro} value={valor.observacoes} onChange={(evento) => onChange({ ...valor, observacoes: evento.target.value })} autoComplete="off" />
    </>
  );
}
