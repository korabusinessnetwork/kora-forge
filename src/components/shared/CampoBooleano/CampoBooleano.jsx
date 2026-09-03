import Campo from '../Campo/Campo.jsx';
import Selecao from '../Selecao/Selecao.jsx';
import { mensagens } from '../../../mensagens.js';

// Atom. Pergunta de sim ou não. Vira Selecao para herdar o selo de padrão Kora e a navegação
// por teclado, em vez de uma caixa de marcar sem default visível.
export default function CampoBooleano({ id, rotulo, microtexto, valor, onChange, padrao = false }) {
  return (
    <Campo id={id} rotulo={rotulo} microtexto={microtexto}>
      <Selecao
        id={id}
        valor={valor ? 'sim' : 'nao'}
        onChange={(escolha) => onChange(escolha === 'sim')}
        opcoes={[
          { valor: 'sim', rotulo: mensagens.wizard.sim, padraoKora: padrao === true },
          { valor: 'nao', rotulo: mensagens.wizard.nao, padraoKora: padrao === false },
        ]}
      />
    </Campo>
  );
}
