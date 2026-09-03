import Campo from '../../../components/shared/Campo/Campo.jsx';
import AvisosDoCampo from '../../../components/wizard/AvisosDoCampo/AvisosDoCampo.jsx';
import { mensagens } from '../../../mensagens.js';

const m = mensagens.wizard.passos.identidade;

export default function Identidade({ valor, onChange, erros = {}, avisosDoCampo = () => [], onDecidirAviso, decidindo, erroAviso }) {
  const alterar = (campo) => (evento) => onChange({ ...valor, [campo]: evento.target.value });
  return (
    <>
      <Campo id="nome" rotulo={m.nome.rotulo} microtexto={m.nome.micro} erro={erros.nome} value={valor.nome} onChange={alterar('nome')} autoComplete="off" maxLength={80} />
      <AvisosDoCampo avisos={avisosDoCampo('identidade.essencia')} onDecidir={onDecidirAviso} salvando={decidindo} erro={erroAviso} />
      <Campo id="essencia" rotulo={m.essencia.rotulo} microtexto={m.essencia.micro} placeholder={m.essencia.placeholder} value={valor.essencia} onChange={alterar('essencia')} autoComplete="off" />
      <Campo id="problema" rotulo={m.problema.rotulo} microtexto={m.problema.micro} placeholder={m.problema.placeholder} value={valor.problema} onChange={alterar('problema')} autoComplete="off" />
      <Campo id="valor" rotulo={m.valor.rotulo} microtexto={m.valor.micro} placeholder={m.valor.placeholder} value={valor.valor} onChange={alterar('valor')} autoComplete="off" />
    </>
  );
}
