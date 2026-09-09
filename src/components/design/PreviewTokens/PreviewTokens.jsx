import { CATALOGO_TOKENS } from '@shared/schemas/design.js';
import { mensagens } from '../../../mensagens.js';
import estilos from './PreviewTokens.module.css';

const m = mensagens.design.preview;

// Só os tokens do modo claro entram no preview. Os do escuro têm o mesmo nome de variável CSS, e
// aplicar os dois no mesmo elemento faria um sobrescrever o outro.
const TOKENS_CLAROS = CATALOGO_TOKENS.filter((token) => token.grupo !== 'escuro');

// Os tokens do projeto entram como variáveis inline neste elemento e valem só para dentro dele.
// É a única exceção à regra de não usar estilo inline em componente de produto: aqui o valor é
// dado do usuário, não decisão de estilo do Forge, e o escopo local é o que impede o design do
// projeto de vazar para a interface da ferramenta (P-06, e ADR-005 nas notas de implementação).
function variaveisDe(tokens) {
  const variaveis = {};
  for (const token of TOKENS_CLAROS) variaveis[token.css] = tokens[token.chave];
  return variaveis;
}

// Molecule. Um pedaço de interface de verdade, desenhado só com os tokens do projeto: sem nenhum
// `--forge-*` dentro, senão o preview mentiria sobre como o projeto vai parecer.
export default function PreviewTokens({ tokens }) {
  return (
    <div className={estilos.moldura}>
      <p className={estilos.rotulo}>{m.titulo}</p>
      <div className={estilos.palco} style={variaveisDe(tokens)} data-testid="palco-preview">
        <div className={estilos.cartao}>
          <h4 className={estilos.tituloAmostra}>{m.amostraTitulo}</h4>
          <p className={estilos.textoAmostra}>{m.amostraTexto}</p>
          <p className={estilos.textoSecundario}>{m.amostraSecundario}</p>
          <div className={estilos.linhaBotoes}>
            <span className={estilos.botaoPrimario}>{m.amostraBotao}</span>
            <span className={estilos.botaoSecundario}>{m.amostraBotaoSecundario}</span>
          </div>
          <div className={estilos.selos}>
            <span className={estilos.seloSucesso}>{m.amostraSucesso}</span>
            <span className={estilos.seloAviso}>{m.amostraAviso}</span>
            <span className={estilos.seloPerigo}>{m.amostraPerigo}</span>
          </div>
          <code className={estilos.mono}>{m.amostraMono}</code>
        </div>
      </div>
    </div>
  );
}
