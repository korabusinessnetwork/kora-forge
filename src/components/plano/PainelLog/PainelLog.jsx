import { useEffect, useRef, useState } from 'react';
import Botao from '../../shared/Botao/Botao.jsx';
import { mensagens } from '../../../mensagens.js';
import estilos from './PainelLog.module.css';

const m = mensagens.log;

// Teto do que é renderizado. Um `npm install` escreve milhares de linhas, e prender tudo no DOM
// deixa a tela travada justamente enquanto ela mais precisa responder. O corte é dito em letras,
// nunca silencioso.
export const TETO_DE_LINHAS = 500;

// Processo de terminal escreve cor e movimento de cursor como sequência de escape. No terminal
// isso vira cor; numa página vira `[32m[1mVITE` no meio da frase. O log continua guardado cru no
// banco, fiel ao que o processo escreveu; a limpeza é só de apresentação.
const ESCAPE_DE_TERMINAL = new RegExp('\\u001b\\[[0-9;?]*[ -/]*[@-~]|\\u001b][^\\u0007]*\\u0007|[\\u0000-\\u0008\\u000b-\\u001f\\u007f]', 'g');

export function limparEscapes(texto) {
  return String(texto).replace(ESCAPE_DE_TERMINAL, '');
}

// Perto o bastante do fim para o autoscroll continuar valendo. Sem folga, um pixel de arredondamento
// travaria a rolagem sozinho.
const FOLGA_DO_FIM = 24;

// Organism. Log ao vivo de **um** run: stdout e stderr diferenciados, autoscroll com trava e
// parar. Não abre WebSocket nem chama API: recebe os eventos já validados e devolve callbacks
// (regra 1 de docs/06). Linha vinda do processo é dado, nunca instrução (P-05), então é sempre
// renderizada como texto.
export default function PainelLog({
  comando = null,
  eventos = [],
  descartados = 0,
  estado = 'ocioso',
  onParar = null,
  onReconectar = null,
}) {
  const areaRef = useRef(null);
  const [seguindo, setSeguindo] = useState(true);

  const linhas = eventos.filter((evento) => evento.tipo === 'linha');
  const fim = eventos.find((evento) => evento.tipo === 'fim') ?? null;
  const cortadas = Math.max(0, linhas.length - TETO_DE_LINHAS);
  const visiveis = cortadas > 0 ? linhas.slice(-TETO_DE_LINHAS) : linhas;

  // Autoscroll com trava: acompanha o fim enquanto a pessoa está no fim. Se ela subiu para ler,
  // a rolagem para de puxar a tela e a ação de voltar aparece.
  useEffect(() => {
    const area = areaRef.current;
    if (!area || !seguindo) return;
    area.scrollTop = area.scrollHeight;
  }, [visiveis.length, seguindo, fim]);

  function aoRolar(evento) {
    const area = evento.currentTarget;
    const noFim = area.scrollHeight - area.scrollTop - area.clientHeight <= FOLGA_DO_FIM;
    setSeguindo(noFim);
  }

  function voltarParaOFim() {
    const area = areaRef.current;
    if (area) area.scrollTop = area.scrollHeight;
    setSeguindo(true);
  }

  const rodando = comando?.estado === 'rodando';
  const conectando = estado === 'conectando';
  const comErro = estado === 'erro';
  const semSaida = !conectando && !comErro && visiveis.length === 0;

  return (
    <section className={estilos.painel} aria-labelledby="titulo-log">
      <header className={estilos.cabecalho}>
        <h3 id="titulo-log" className={estilos.titulo}>{m.titulo}</h3>
        {comando ? <p className={estilos.comando}>{m.de(`${comando.cmd} ${comando.args.join(' ')}`)}</p> : null}
        <p className={estilos.contagem}>{m.linhas(linhas.length)}</p>
        {/* A regra 6 do design system exige o parar dentro do log ao vivo, e a fila também o tem.
            O nome aqui carrega o comando, para os dois não virarem dois botões iguais na tela
            nem duas leituras idênticas no leitor de tela. */}
        {rodando && onParar ? (
          <Botao variante="fantasma" onClick={() => onParar(comando.runId)}>{m.parar(`${comando.cmd} ${comando.args.join(' ')}`)}</Botao>
        ) : null}
      </header>

      {!comando ? (
        <div className={estilos.estadoVazio}>
          <p>{m.semComando}</p>
          <p className={estilos.microtexto}>{m.semComandoTexto}</p>
        </div>
      ) : (
        <>
          {conectando ? <p role="status" className={estilos.microtexto}>{m.conectando}</p> : null}

          {comErro ? (
            <div role="alert" className={estilos.erro}>
              <p>{m.erro}</p>
              {onReconectar ? <Botao variante="secundario" onClick={onReconectar}>{m.reconectar}</Botao> : null}
            </div>
          ) : null}

          {semSaida ? (
            <div className={estilos.estadoVazio}>
              <p>{m.vazio}</p>
              <p className={estilos.microtexto}>{m.vazioTexto}</p>
            </div>
          ) : null}

          {cortadas > 0 ? <p className={estilos.microtexto}>{m.cortado(TETO_DE_LINHAS)}</p> : null}

          <div
            ref={areaRef}
            className={estilos.area}
            onScroll={aoRolar}
            role="log"
            aria-live="polite"
            aria-label={comando ? m.de(`${comando.cmd} ${comando.args.join(' ')}`) : m.titulo}
            tabIndex={0}
          >
            {visiveis.map((evento, indice) => (
              <p
                // A chave leva o índice porque duas linhas idênticas no mesmo instante são
                // normais em log, e o índice é estável: a lista só cresce no fim.
                key={`${evento.ts}-${indice}`}
                className={estilos.linha}
                data-stream={evento.stream}
              >
                <span className={estilos.rotuloStream}>{m.stream[evento.stream]}</span>
                <span className={estilos.texto}>{limparEscapes(evento.linha)}</span>
              </p>
            ))}
            {fim ? <p className={estilos.fim} data-stream="fim">{m.fim(mensagens.materializacao.comandoEstado[fim.estado] ?? fim.estado)}</p> : null}
          </div>

          {!seguindo ? (
            <div className={estilos.trava}>
              <p className={estilos.microtexto}>{m.travado}</p>
              <Botao variante="secundario" onClick={voltarParaOFim}>{m.seguirOFim}</Botao>
            </div>
          ) : null}

          {descartados > 0 ? <p role="status" className={estilos.microtexto}>{m.descartados(descartados)}</p> : null}
        </>
      )}
    </section>
  );
}
