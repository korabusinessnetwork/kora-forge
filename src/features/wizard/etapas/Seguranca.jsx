import Campo from '../../../components/shared/Campo/Campo.jsx';
import CampoBooleano from '../../../components/shared/CampoBooleano/CampoBooleano.jsx';
import ListaDeTextos from '../../../components/shared/ListaDeTextos/ListaDeTextos.jsx';
import AvisosDoCampo from '../../../components/wizard/AvisosDoCampo/AvisosDoCampo.jsx';
import { mensagens } from '../../../mensagens.js';

const m = mensagens.wizard.passos.seguranca;

export default function Seguranca({ valor, onChange, avisosDoCampo = () => [], onDecidirAviso, decidindo, erroAviso }) {
  const alterar = (campo, novo) => onChange({ ...valor, [campo]: novo });
  return (
    <>
      <CampoBooleano id="dadoPessoal" rotulo={m.dadoPessoal.rotulo} microtexto={m.dadoPessoal.micro} valor={valor.dadoPessoal} padrao={false} onChange={(novo) => alterar('dadoPessoal', novo)} />
      <AvisosDoCampo avisos={avisosDoCampo('seguranca.dadoPessoal')} onDecidir={onDecidirAviso} salvando={decidindo} erro={erroAviso} />
      <CampoBooleano id="dadoFinanceiro" rotulo={m.dadoFinanceiro.rotulo} microtexto={m.dadoFinanceiro.micro} valor={valor.dadoFinanceiro} padrao={false} onChange={(novo) => alterar('dadoFinanceiro', novo)} />
      <AvisosDoCampo avisos={avisosDoCampo('seguranca.dadoFinanceiro')} onDecidir={onDecidirAviso} salvando={decidindo} erro={erroAviso} />
      <ListaDeTextos id="compliance" rotulo={m.compliance.rotulo} microtexto={m.compliance.micro} placeholder={m.compliance.placeholder} itens={valor.compliance} onChange={(itens) => alterar('compliance', itens)} />
      <CampoBooleano id="tierGratuito" rotulo={m.tierGratuito.rotulo} microtexto={m.tierGratuito.micro} valor={valor.tierGratuito} padrao onChange={(novo) => alterar('tierGratuito', novo)} />
      <AvisosDoCampo avisos={avisosDoCampo('seguranca.tierGratuito')} onDecidir={onDecidirAviso} salvando={decidindo} erro={erroAviso} />
      <Campo id="observacoes" rotulo={m.observacoes.rotulo} microtexto={m.observacoes.micro} value={valor.observacoes} onChange={(e) => alterar('observacoes', e.target.value)} autoComplete="off" />
    </>
  );
}
