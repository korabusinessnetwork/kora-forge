import { Link } from 'react-router-dom';
import Chave from '../../shared/Chave/Chave.jsx';
import { caminhoDeEditor } from '../../../utils/caminhoDeEditor.js';
import { mensagens } from '../../../mensagens.js';
import estilos from './TelaFinal.module.css';

const m = mensagens.telaFinal;

// Organism. O fechamento do fluxo: onde o projeto ficou, o que nasceu, e para onde ir agora.
// Nunca é beco sem saída, e nunca executa nada: o atalho do editor é um link `vscode://`
// resolvido pelo sistema operacional.
export default function TelaFinal({ materializacao, projeto }) {
  const abortada = materializacao.estado === 'abortada';
  const textos = abortada ? m.abortada : m;
  const { criados, sobrescritos, pulados } = materializacao.arquivos;
  const rodados = materializacao.comandos.filter((comando) => comando.estado !== 'pendente').length;
  const linkDoEditor = caminhoDeEditor(materializacao.raiz);

  return (
    <section className={estilos.tela} aria-labelledby="titulo-tela-final" data-estado={materializacao.estado}>
      <h2 id="titulo-tela-final" className={estilos.titulo}>{textos.titulo}</h2>
      <p className={estilos.micro}>{textos.micro}</p>

      <p className={estilos.nome}>{projeto.nome}</p>
      <Chave valor={materializacao.raiz} rotulo={m.caminho} />

      <p className={estilos.resumo}>{textos.resumo(criados, rodados)}</p>
      {!abortada ? <p className={estilos.detalhe}>{m.detalhe(sobrescritos, pulados)}</p> : null}

      <div className={estilos.acoes}>
        {linkDoEditor ? (
          <a className={estilos.atalho} href={linkDoEditor}>{m.abrirNoEditor}</a>
        ) : null}
        <Link className={estilos.link} to={`/projetos/${projeto.id}`}>{m.verProjeto}</Link>
      </div>

      {linkDoEditor ? <p className={estilos.detalhe}>{m.abrirMicro}</p> : null}
    </section>
  );
}
