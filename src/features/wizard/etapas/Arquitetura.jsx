import { MODELOS_ARQUITETURA } from '@shared/schemas/respostas.js';
import Campo from '../../../components/shared/Campo/Campo.jsx';
import CampoBooleano from '../../../components/shared/CampoBooleano/CampoBooleano.jsx';
import Selecao from '../../../components/shared/Selecao/Selecao.jsx';
import ListaDeTextos from '../../../components/shared/ListaDeTextos/ListaDeTextos.jsx';
import AvisosDoCampo from '../../../components/wizard/AvisosDoCampo/AvisosDoCampo.jsx';
import { defaultsDaEtapa } from '../defaults.js';
import { mensagens } from '../../../mensagens.js';

const m = mensagens.wizard.passos.arquitetura;

export default function Arquitetura({ valor, onChange, preset, avisosDoCampo = () => [], onDecidirAviso, decidindo, erroAviso }) {
  const padrao = defaultsDaEtapa('arquitetura', preset, null);
  const alterar = (campo, novo) => onChange({ ...valor, [campo]: novo });
  return (
    <>
      <Campo id="modelo" rotulo={m.modelo.rotulo} microtexto={m.modelo.micro}>
        <Selecao
          id="modelo"
          valor={valor.modelo}
          onChange={(novo) => alterar('modelo', novo)}
          opcoes={MODELOS_ARQUITETURA.map((modelo) => ({ valor: modelo, rotulo: m.modelos[modelo], padraoKora: modelo === padrao.modelo }))}
        />
      </Campo>
      <AvisosDoCampo avisos={avisosDoCampo('arquitetura.modelo')} onDecidir={onDecidirAviso} salvando={decidindo} erro={erroAviso} />
      <ListaDeTextos id="stack" rotulo={m.stack.rotulo} microtexto={m.stack.micro} placeholder={m.stack.placeholder} itens={valor.stack} onChange={(itens) => alterar('stack', itens)} />
      <AvisosDoCampo avisos={avisosDoCampo('arquitetura.stack')} onDecidir={onDecidirAviso} salvando={decidindo} erro={erroAviso} />
      <CampoBooleano id="multiTenant" rotulo={m.multiTenant.rotulo} microtexto={m.multiTenant.micro} valor={valor.multiTenant} padrao={padrao.multiTenant} onChange={(novo) => alterar('multiTenant', novo)} />
      <AvisosDoCampo avisos={avisosDoCampo('arquitetura.multiTenant')} onDecidir={onDecidirAviso} salvando={decidindo} erro={erroAviso} />
      <CampoBooleano id="whiteLabel" rotulo={m.whiteLabel.rotulo} microtexto={m.whiteLabel.micro} valor={valor.whiteLabel} padrao={padrao.whiteLabel} onChange={(novo) => alterar('whiteLabel', novo)} />
      <CampoBooleano id="auth" rotulo={m.auth.rotulo} microtexto={m.auth.micro} valor={valor.auth} padrao={padrao.auth} onChange={(novo) => alterar('auth', novo)} />
      <AvisosDoCampo avisos={avisosDoCampo('arquitetura.auth')} onDecidir={onDecidirAviso} salvando={decidindo} erro={erroAviso} />
      <Campo id="deploy" rotulo={m.deploy.rotulo} microtexto={m.deploy.micro} padrao={padrao.deploy || null} placeholder={m.deploy.placeholder} value={valor.deploy} onChange={(e) => alterar('deploy', e.target.value)} autoComplete="off" />
    </>
  );
}
