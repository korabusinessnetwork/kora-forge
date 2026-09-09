import { CATALOGO_TOKENS, GRUPOS, TOKENS_PADRAO, FORMATO_ESPERADO } from '@shared/schemas/design.js';
import Botao from '../../shared/Botao/Botao.jsx';
import Campo from '../../shared/Campo/Campo.jsx';
import { mensagens } from '../../../mensagens.js';
import estilos from './PainelTokens.module.css';

const m = mensagens.design;

const POR_GRUPO = GRUPOS.map((grupo) => ({
  grupo,
  tokens: CATALOGO_TOKENS.filter((token) => token.grupo === grupo),
}));

// Organism. Edita os tokens do projeto (ADR-005). O catálogo é fechado, então a tela é gerada a
// partir dele: token novo aparece aqui sem ninguém mexer neste arquivo.
export default function PainelTokens({ tokens, onMudar, onRestaurarTudo }) {
  const alterados = Object.keys(TOKENS_PADRAO).filter((chave) => tokens[chave] !== TOKENS_PADRAO[chave]);

  return (
    <section className={estilos.painel} aria-labelledby="titulo-tokens">
      <header className={estilos.cabecalho}>
        <h3 id="titulo-tokens" className={estilos.titulo}>{m.titulo}</h3>
        <p className={estilos.micro}>{alterados.length === 0 ? m.nenhumAlterado : m.quantosAlterados(alterados.length)}</p>
        <Botao variante="fantasma" desabilitado={alterados.length === 0} onClick={onRestaurarTudo}>{m.restaurarTudo}</Botao>
      </header>

      {POR_GRUPO.map(({ grupo, tokens: doGrupo }) => (
        <fieldset key={grupo} className={estilos.grupo}>
          <legend className={estilos.legenda}>{m.grupos[grupo]}</legend>
          <div className={estilos.campos}>
            {doGrupo.map((token) => {
              const valor = tokens[token.chave];
              const noPadrao = valor === token.padrao;
              return (
                <Campo
                  key={token.chave}
                  id={`token-${token.chave}`}
                  rotulo={token.rotulo}
                  microtexto={noPadrao ? m.microNoPadrao(FORMATO_ESPERADO[token.tipo]) : m.microAlterado(token.padrao)}
                  className={estilos.campo}
                >
                  <div className={estilos.controle}>
                    {token.tipo === 'cor' ? (
                      <input
                        type="color"
                        className={estilos.corVisual}
                        value={/^#[0-9a-fA-F]{6}$/.test(valor) ? valor : '#000000'}
                        onChange={(evento) => onMudar(token.chave, evento.target.value)}
                        aria-label={m.escolherCor(token.rotulo)}
                      />
                    ) : null}
                    <input
                      id={`token-${token.chave}`}
                      className={estilos.entrada}
                      value={valor}
                      onChange={(evento) => onMudar(token.chave, evento.target.value)}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <Botao
                      variante="fantasma"
                      desabilitado={noPadrao}
                      onClick={() => onMudar(token.chave, token.padrao)}
                      aria-label={m.restaurarToken(token.rotulo)}
                    >
                      {m.restaurar}
                    </Botao>
                  </div>
                </Campo>
              );
            })}
          </div>
        </fieldset>
      ))}
    </section>
  );
}
