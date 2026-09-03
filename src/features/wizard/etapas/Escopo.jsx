import Campo from '../../../components/shared/Campo/Campo.jsx';
import ListaDeTextos from '../../../components/shared/ListaDeTextos/ListaDeTextos.jsx';
import { mensagens } from '../../../mensagens.js';

const m = mensagens.wizard.passos.escopo;

export default function Escopo({ valor, onChange }) {
  const alterar = (campo, novo) => onChange({ ...valor, [campo]: novo });
  return (
    <>
      <Campo id="publico" rotulo={m.publico.rotulo} microtexto={m.publico.micro} placeholder={m.publico.placeholder} value={valor.publico} onChange={(e) => alterar('publico', e.target.value)} autoComplete="off" />
      <ListaDeTextos id="personas" rotulo={m.personas.rotulo} microtexto={m.personas.micro} placeholder={m.personas.placeholder} itens={valor.personas} onChange={(itens) => alterar('personas', itens)} />
      <Campo id="ahaMoment" rotulo={m.ahaMoment.rotulo} microtexto={m.ahaMoment.micro} placeholder={m.ahaMoment.placeholder} value={valor.ahaMoment} onChange={(e) => alterar('ahaMoment', e.target.value)} autoComplete="off" />
      <ListaDeTextos id="naoObjetivos" rotulo={m.naoObjetivos.rotulo} microtexto={m.naoObjetivos.micro} placeholder={m.naoObjetivos.placeholder} itens={valor.naoObjetivos} onChange={(itens) => alterar('naoObjetivos', itens)} />
    </>
  );
}
