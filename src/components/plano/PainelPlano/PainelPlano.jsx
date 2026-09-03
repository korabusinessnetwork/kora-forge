import LinhaPlano from '../LinhaPlano/LinhaPlano.jsx';
import Chave from '../../shared/Chave/Chave.jsx';
import { formatarBytes, pastaDe } from '../../../utils/formatarBytes.js';
import { mensagens } from '../../../mensagens.js';
import estilos from './PainelPlano.module.css';

const m = mensagens.plano;

export function agruparPorPasta(arquivos) {
  const grupos = new Map();
  for (const arquivo of arquivos) {
    const pasta = pastaDe(arquivo.caminho);
    if (!grupos.has(pasta)) grupos.set(pasta, []);
    grupos.get(pasta).push(arquivo);
  }
  return [...grupos.entries()];
}

// Organism. O dry-run inteiro: conflitos no topo, arquivos agrupados por pasta, comandos e
// pendências. Diz em letras que nada foi escrito, porque é isso que separa planejar de executar.
export default function PainelPlano({ plano }) {
  const conflitos = plano.arquivos.filter((arquivo) => arquivo.acao === 'sobrescrever');
  return (
    <section className={estilos.painel} aria-labelledby="titulo-plano">
      <header className={estilos.cabecalho}>
        <h2 id="titulo-plano">{m.titulo}</h2>
        <p className={estilos.resumo}>{m.resumo(plano.totais.arquivos, formatarBytes(plano.totais.bytes), plano.comandos.length)}</p>
        <Chave valor={plano.raiz} rotulo={m.raiz} />
        <p role="note" className={estilos.nota}>{m.nadaEscrito}</p>
      </header>

      {conflitos.length > 0 ? (
        <section className={estilos.conflitos} aria-labelledby="titulo-conflitos">
          <h3 id="titulo-conflitos" className={estilos.subtitulo}>{m.conflitos(conflitos.length)}</h3>
          <p className={estilos.aviso}>{m.conflitoExplicacao}</p>
          <ul className={estilos.lista}>
            {conflitos.map((arquivo) => <LinhaPlano key={arquivo.caminho} arquivo={arquivo} />)}
          </ul>
        </section>
      ) : null}

      {plano.pendencias.length > 0 ? (
        <section className={estilos.pendencias} aria-labelledby="titulo-pendencias">
          <h3 id="titulo-pendencias" className={estilos.subtitulo}>{m.pendencias(plano.pendencias.length)}</h3>
          <ul className={estilos.listaSimples}>
            {plano.pendencias.map((pendencia) => (
              <li key={pendencia.item}><code className={estilos.mono}>{pendencia.item}</code> — {pendencia.motivo}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="titulo-arquivos">
        <h3 id="titulo-arquivos" className={estilos.subtitulo}>{m.arquivos}</h3>
        {agruparPorPasta(plano.arquivos).map(([pasta, arquivos]) => (
          <div key={pasta} className={estilos.grupo}>
            <p className={estilos.pasta}>{pasta === '.' ? m.raizDoProjeto : `${pasta}/`}</p>
            <ul className={estilos.lista}>
              {arquivos.map((arquivo) => <LinhaPlano key={arquivo.caminho} arquivo={arquivo} />)}
            </ul>
          </div>
        ))}
      </section>

      <section aria-labelledby="titulo-comandos">
        <h3 id="titulo-comandos" className={estilos.subtitulo}>{m.comandos}</h3>
        <ul className={estilos.listaSimples}>
          {plano.comandos.map((comando) => (
            <li key={comando.id}>
              <code className={estilos.mono}>{comando.cmd} {comando.args.join(' ')}</code>
              <span className={estilos.tagComando}>{comando.obrigatorio ? m.obrigatorio : m.opcional}</span>
              {comando.longaDuracao ? <span className={estilos.tagComando}>{m.longaDuracao}</span> : null}
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
