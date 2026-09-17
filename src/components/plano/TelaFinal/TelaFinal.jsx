import { Link } from 'react-router-dom';
import Botao from '../../shared/Botao/Botao.jsx';
import Chave from '../../shared/Chave/Chave.jsx';
import { caminhoDeEditor } from '../../../utils/caminhoDeEditor.js';
import { mensagens } from '../../../mensagens.js';
import estilos from './TelaFinal.module.css';

const m = mensagens.telaFinal;

// Organism. O fechamento do fluxo F-01: onde o projeto ficou, o que nasceu, e para onde ir agora.
// Nunca é beco sem saída.
//
// São três saídas, e cada uma existe por um motivo diferente:
//
// 1. **Abrir no editor**, um link `vscode://file/...` resolvido pelo sistema operacional. Não
//    executa processo nenhum, e por isso não precisa passar pelo servidor.
// 2. **Abrir a pasta**, que executa processo e por isso é capacidade própria do Forge (ADR-010),
//    pedida ao servidor. Existe porque o Forge não sabe qual editor o dono usa, e a pasta é o
//    denominador comum que sempre funciona.
// 3. **A URL do projeto rodando**, quando um comando de longa duração anunciou uma (B-01). É
//    link, e nunca botão que mande o sistema abrir: a interface do Forge já está num browser, e
//    entregar texto vindo de um processo para um binário seria promover dado a instrução (B-02).
//
// Materialização abortada tem título, microtexto e resumo próprios: o que foi escrito continua no
// disco de propósito, porque não existe desfazer (ADR-002).
export default function TelaFinal({ materializacao, projeto, onAbrir = null, abrindo = false, erroAoAbrir = null }) {
  const abortada = materializacao.estado === 'abortada';
  const textos = abortada ? m.abortada : m;
  const { criados, sobrescritos, pulados } = materializacao.arquivos;
  const rodados = materializacao.comandos.filter((comando) => comando.estado !== 'pendente').length;
  const linkDoEditor = caminhoDeEditor(materializacao.raiz);
  // A URL vem do que o dev server anunciou, já validada no servidor. Materialização abortada não
  // mostra endereço: se parou no meio, não há o que prometer que está no ar.
  const url = abortada ? null : materializacao.comandos.find((comando) => comando.url)?.url ?? null;

  return (
    <section className={estilos.tela} aria-labelledby="titulo-tela-final" data-estado={materializacao.estado}>
      <h2 id="titulo-tela-final" className={estilos.titulo}>{textos.titulo}</h2>
      <p className={estilos.micro}>{textos.micro}</p>

      <p className={estilos.nome}>{projeto.nome}</p>
      <Chave valor={materializacao.raiz} rotulo={m.caminho} />

      <p className={estilos.resumo}>{textos.resumo(criados, rodados)}</p>
      {!abortada ? <p className={estilos.detalhe}>{m.detalhe(sobrescritos, pulados)}</p> : null}

      {url ? (
        <div className={estilos.endereco}>
          <p className={estilos.subtitulo}>{m.urlTitulo}</p>
          <a className={estilos.link} href={url} target="_blank" rel="noreferrer">{url}</a>
          <p className={estilos.micro}>{m.urlMicro}</p>
          <Chave valor={url} rotulo={m.rotuloUrl} />
        </div>
      ) : null}

      <div className={estilos.acoes}>
        {linkDoEditor ? (
          <a className={estilos.atalho} href={linkDoEditor}>{m.abrirNoEditor}</a>
        ) : null}
        {onAbrir ? (
          <Botao variante="secundario" carregando={abrindo} onClick={onAbrir}>{m.abrirPasta}</Botao>
        ) : null}
        <Link className={estilos.link} to={`/projetos/${projeto.id}`}>{m.verProjeto}</Link>
      </div>

      {linkDoEditor ? <p className={estilos.detalhe}>{m.abrirNoEditorMicro}</p> : null}
      {onAbrir ? <p className={estilos.detalhe}>{m.abrirPastaMicro}</p> : null}

      {erroAoAbrir ? (
        <p role="alert" className={estilos.erro}>{erroAoAbrir.message ?? mensagens.estados.erroGenerico}</p>
      ) : null}
    </section>
  );
}
