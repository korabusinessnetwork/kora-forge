import Botao from '../../shared/Botao/Botao.jsx';
import Selo from '../../shared/Selo/Selo.jsx';
import Chave from '../../shared/Chave/Chave.jsx';
import { mensagens } from '../../../mensagens.js';
import estilos from './PainelMaterializacao.module.css';

const m = mensagens.materializacao;
const SELO_POR_ESTADO = { sucesso: 'materializado', falha: 'invalida', timeout: 'invalida', cancelado: 'arquivado', pulado: 'arquivado', rodando: 'pronto', pendente: 'rascunho' };

// Organism. O que está acontecendo agora: arquivos escritos, comandos em fila, e as três saídas
// quando algo falha (RN-05.5). O log ao vivo, linha a linha, chega no bloco 8.
export default function PainelMaterializacao({ materializacao, onDecidir, onParar, decidindo }) {
  const paradoEmFalha = materializacao.estado === 'parado_em_falha';
  return (
    <section className={estilos.painel} aria-labelledby="titulo-materializacao">
      <h3 id="titulo-materializacao" className={estilos.titulo}>{m.titulo}</h3>
      <p role="status" className={estilos.estado}>{m.estado[materializacao.estado]}</p>
      <p className={estilos.resumo}>{m.arquivos(materializacao.arquivos.criados, materializacao.arquivos.sobrescritos, materializacao.arquivos.pulados)}</p>
      <Chave valor={materializacao.raiz} rotulo={mensagens.plano.raiz} />

      <ul className={estilos.comandos}>
        {materializacao.comandos.map((comando) => (
          <li key={comando.id} className={estilos.comando}>
            <code className={estilos.mono}>{comando.cmd} {comando.args.join(' ')}</code>
            <Selo estado={SELO_POR_ESTADO[comando.estado] ?? 'rascunho'}>{m.comandoEstado[comando.estado]}</Selo>
            {comando.exitCode !== null && comando.exitCode !== 0 ? <span className={estilos.saida}>exit {comando.exitCode}</span> : null}
            {comando.erro ? <span className={estilos.saida}>{comando.erro}</span> : null}
            {comando.estado === 'rodando' && comando.runId ? <Botao variante="fantasma" onClick={() => onParar(comando.runId)}>{m.parar}</Botao> : null}
          </li>
        ))}
      </ul>

      {paradoEmFalha ? (
        <div role="alert" className={estilos.decisao}>
          <p>{m.estado.parado_em_falha}</p>
          <div className={estilos.acoes}>
            <Botao variante="secundario" carregando={decidindo} onClick={() => onDecidir('repetir')}>{m.repetir}</Botao>
            <Botao variante="fantasma" carregando={decidindo} onClick={() => onDecidir('pular')}>{m.pular}</Botao>
            <Botao variante="destrutivo" carregando={decidindo} onClick={() => onDecidir('abortar')}>{m.abortar}</Botao>
          </div>
        </div>
      ) : null}
    </section>
  );
}
