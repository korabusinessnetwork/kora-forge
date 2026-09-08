import Botao from '../../shared/Botao/Botao.jsx';
import Chave from '../../shared/Chave/Chave.jsx';
import { mensagens } from '../../../mensagens.js';
import estilos from './TelaFinal.module.css';

const m = mensagens.telaFinal;
const mm = mensagens.materializacao;

// Organism. O fim do fluxo F-01, como descrito em docs/05_FLUXOS: caminho no disco, o que foi
// criado e o atalho para chegar lá. A lista de comandos com o resultado fica no
// PainelMaterializacao, ao lado, e repeti-la aqui só somaria ruído.
// Só aparece em materialização concluída. Abortada e parada em falha continuam no painel anterior.
export default function TelaFinal({ materializacao, onAbrir, abrindo, erroAoAbrir }) {
  const { arquivos, raiz } = materializacao;

  return (
    <section className={estilos.tela} aria-labelledby="titulo-tela-final">
      <h3 id="titulo-tela-final" className={estilos.titulo}>{m.titulo}</h3>
      <p className={estilos.micro}>{m.micro}</p>

      <Chave valor={raiz} rotulo={m.rotuloCaminho} />

      <p className={estilos.resumo}>{mm.arquivos(arquivos.criados, arquivos.sobrescritos, arquivos.pulados)}</p>

      <div className={estilos.acoes}>
        <Botao variante="primario" carregando={abrindo} onClick={onAbrir}>{m.abrir}</Botao>
        <span className={estilos.micro}>{m.abrirMicro}</span>
      </div>

      {erroAoAbrir ? <p role="alert" className={estilos.erro}>{erroAoAbrir.message ?? mensagens.estados.erroGenerico}</p> : null}
    </section>
  );
}
