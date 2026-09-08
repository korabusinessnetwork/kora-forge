import { useCallback, useEffect, useRef, useState } from 'react';
import { assinarLog } from '../../../services/logAoVivo.js';
import Botao from '../../shared/Botao/Botao.jsx';
import { mensagens } from '../../../mensagens.js';
import estilos from './PainelLog.module.css';

const m = mensagens.log;

// Teto de linhas na tela. O `npm install` cospe centenas, e guardar tudo trava a aba sem dar nada
// em troca: o que interessa numa falha é o fim, não o começo.
const TETO_DE_LINHAS = 500;

// Perto do fim conta como "o usuário está acompanhando". Acima disso ele rolou para ler algo, e
// puxar a tela de volta seria roubar o controle dele.
const MARGEM_DO_FIM = 24;

// Organism. Log ao vivo de um comando, ao lado do PainelMaterializacao, nunca no lugar dele.
export default function PainelLog({ runId, rotulo }) {
  const [linhas, setLinhas] = useState([]);
  const [conexao, setConexao] = useState('conectando');
  const [fim, setFim] = useState(null);
  const [tentativa, setTentativa] = useState(0);

  const caixa = useRef(null);
  const grudadoNoFim = useRef(true);
  const proximaChave = useRef(0);

  useEffect(() => {
    if (!runId) return undefined;
    // Limpa antes de assinar, tanto na troca de run quanto ao reconectar. O transmissor reenvia
    // todo o histórico para quem assina, então começar do zero é justamente o que impede a tela de
    // duplicar as linhas que já estavam ali.
    setLinhas([]);
    setFim(null);
    proximaChave.current = 0;
    grudadoNoFim.current = true;

    return assinarLog(runId, {
      onEstado: setConexao,
      onEvento: (evento) => {
        if (evento.tipo === 'fim') {
          setFim(evento);
          return;
        }
        setLinhas((atuais) => {
          const proximas = [...atuais, { ...evento, chave: proximaChave.current++ }];
          return proximas.length > TETO_DE_LINHAS ? proximas.slice(-TETO_DE_LINHAS) : proximas;
        });
      },
    });
  }, [runId, tentativa]);

  useEffect(() => {
    if (!grudadoNoFim.current || !caixa.current) return;
    caixa.current.scrollTop = caixa.current.scrollHeight;
  }, [linhas, fim]);

  const aoRolar = useCallback((evento) => {
    const { scrollTop, scrollHeight, clientHeight } = evento.currentTarget;
    grudadoNoFim.current = scrollHeight - scrollTop - clientHeight <= MARGEM_DO_FIM;
  }, []);

  const perdeuConexao = (conexao === 'desconectado' || conexao === 'erro') && !fim;
  const semSessao = conexao === 'sem-sessao';
  const vazio = linhas.length === 0 && !fim;

  return (
    <section className={estilos.painel} aria-labelledby="titulo-log">
      <header className={estilos.cabecalho}>
        <h3 id="titulo-log" className={estilos.titulo}>{m.titulo}</h3>
        {rotulo ? <code className={estilos.rotulo}>{rotulo}</code> : null}
      </header>

      <div
        className={estilos.caixa}
        ref={caixa}
        onScroll={aoRolar}
        role="log"
        aria-live="polite"
        aria-label={m.regiao}
        tabIndex={0}
      >
        {vazio ? <p className={estilos.vazio}>{semSessao ? m.semSessao : m.esperando}</p> : null}
        {linhas.map((linha) => (
          <p key={linha.chave} className={linha.stream === 'stderr' ? estilos.linhaErro : estilos.linha}>
            <span className={estilos.marcador} aria-hidden="true">{linha.stream === 'stderr' ? '!' : '·'}</span>
            <span className={estilos.vozDoStream}>{m.stream[linha.stream]}</span>
            {linha.linha}
          </p>
        ))}
      </div>

      {fim ? (
        <p role="status" className={estilos.fim}>
          {m.fim(fim.estado, fim.exitCode)}
          {fim.erro ? ` ${fim.erro}` : ''}
        </p>
      ) : null}

      {perdeuConexao ? (
        <div role="alert" className={estilos.aviso}>
          <p>{m.conexaoPerdida}</p>
          <Botao variante="secundario" onClick={() => setTentativa((n) => n + 1)}>{m.reconectar}</Botao>
        </div>
      ) : null}
    </section>
  );
}
