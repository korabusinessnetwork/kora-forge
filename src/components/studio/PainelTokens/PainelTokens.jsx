import Botao from '../../shared/Botao/Botao.jsx';
import Campo from '../../shared/Campo/Campo.jsx';
import { listarGrupos, corParaSeletor, seletorRepresenta } from '../../../features/studio/campos.js';
import { mensagens } from '../../../mensagens.js';
import estilos from './PainelTokens.module.css';

const m = mensagens.studio.tokens;

// Organism. Edita os tokens do documento de design. Os campos vêm de `listarCampos()`, derivados
// do schema, então token novo aparece aqui sozinho e nenhum token fica sem editor.
//
// Cor tem dois controles ligados ao mesmo token: o seletor nativo para escolher, e o campo de
// texto para colar o hex exato da marca (ou um `rgb()`, que o seletor não representa).
export default function PainelTokens({ tokens, onTrocar, onRestaurarGrupo, onRestaurarTudo, somenteLeitura = false }) {
  const grupos = listarGrupos(tokens);

  return (
    <div className={estilos.painel}>
      <div className={estilos.topo}>
        <Botao variante="secundario" onClick={onRestaurarTudo} desabilitado={somenteLeitura}>{m.padraoKora}</Botao>
        <p className={estilos.micro}>{m.padraoKoraMicro}</p>
      </div>

      {grupos.map((grupo) => (
        <section key={grupo.grupo} className={estilos.grupo} aria-labelledby={`grupo-${grupo.grupo}`}>
          <div className={estilos.cabecalho}>
            <h3 id={`grupo-${grupo.grupo}`} className={estilos.titulo}>{grupo.titulo}</h3>
            <Botao
              variante="fantasma"
              onClick={() => onRestaurarGrupo(grupo.grupo)}
              desabilitado={somenteLeitura}
              aria-label={m.restaurarGrupoRotulo(grupo.titulo)}
            >
              {m.restaurarGrupo}
            </Botao>
          </div>
          <p className={estilos.micro}>{grupo.micro}</p>

          <div className={estilos.campos}>
            {grupo.campos.map((campo) => (
              <CampoDeToken key={campo.caminho} campo={campo} onTrocar={onTrocar} somenteLeitura={somenteLeitura} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// Dois campos podem gerar a mesma variável (`cor.fundo` e `corEscuro.fundo` viram `--cor-fundo`),
// então o microtexto precisa dizer em qual bloco do arquivo gerado cada um cai.
const microDe = (campo) => (campo.escuro ? m.microEscuro(campo.variavel) : m.micro(campo.variavel));

function CampoDeToken({ campo, onTrocar, somenteLeitura }) {
  const valor = campo.valor;
  // Vazio é recusado pelo contrato do bloco 1. Dizer isso junto do campo, antes de tentar salvar,
  // é prevenção de erro em vez de mensagem de erro.
  const erro = String(valor).trim() === '' ? m.vazio : null;
  const trocar = (novo) => onTrocar(campo.caminho, novo);

  if (campo.tipo !== 'cor') {
    return (
      <Campo
        id={campo.id}
        rotulo={campo.rotulo}
        microtexto={microDe(campo)}
        padrao={campo.padrao}
        erro={erro}
        mono
        value={valor}
        onChange={(evento) => trocar(evento.target.value)}
        readOnly={somenteLeitura}
        autoComplete="off"
      />
    );
  }

  const noSeletor = seletorRepresenta(valor);
  return (
    <Campo id={campo.id} rotulo={campo.rotulo} microtexto={microDe(campo)} padrao={campo.padrao} erro={erro}>
      <div className={estilos.cor}>
        <input
          type="color"
          className={estilos.seletor}
          value={corParaSeletor(valor)}
          onChange={(evento) => trocar(evento.target.value)}
          disabled={somenteLeitura}
          aria-label={`${campo.rotulo}, ${m.corSeletor}`}
        />
        <input
          id={campo.id}
          type="text"
          className={estilos.texto}
          value={valor}
          onChange={(evento) => trocar(evento.target.value)}
          readOnly={somenteLeitura}
          autoComplete="off"
          spellCheck={false}
          aria-label={`${campo.rotulo}, ${m.corTexto}`}
          aria-describedby={`${campo.id}-microtexto`}
          aria-invalid={erro ? true : undefined}
        />
      </div>
      {!noSeletor && !erro ? <p className={estilos.nota}>{m.foraDoSeletor}</p> : null}
    </Campo>
  );
}
