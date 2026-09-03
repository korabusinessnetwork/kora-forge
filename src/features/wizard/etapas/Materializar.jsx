import CampoBooleano from '../../../components/shared/CampoBooleano/CampoBooleano.jsx';
import { mensagens } from '../../../mensagens.js';
import estilos from './Fundacao.module.css';

const m = mensagens.wizard.passos.materializar;

export default function Materializar({ valor, onChange, projeto, respostas }) {
  const identidade = respostas.identidade ?? {};
  const arquitetura = respostas.arquitetura ?? {};
  return (
    <>
      <section className={estilos.bloco}>
        <h2 className={estilos.titulo}>{m.resumo}</h2>
        <dl className={estilos.lista}>
          <div><dt className={estilos.titulo}>{mensagens.projeto.preset}</dt><dd className={estilos.texto}>{projeto.presetNome}</dd></div>
          <div><dt className={estilos.titulo}>{mensagens.wizard.passos.identidade.essencia.rotulo}</dt><dd className={estilos.texto}>{identidade.essencia || '—'}</dd></div>
          <div><dt className={estilos.titulo}>{mensagens.wizard.passos.arquitetura.modelo.rotulo}</dt><dd className={estilos.texto}>{arquitetura.modelo ? mensagens.wizard.passos.arquitetura.modelos[arquitetura.modelo] : '—'}</dd></div>
        </dl>
      </section>
      <p className={estilos.texto} role="note">{m.indisponivel}</p>
      <CampoBooleano id="confirmada" rotulo={m.confirmada.rotulo} microtexto={m.confirmada.micro} valor={valor.confirmada} padrao={false} onChange={(novo) => onChange({ ...valor, confirmada: novo })} />
    </>
  );
}
