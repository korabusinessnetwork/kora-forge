import Chave from '../../components/shared/Chave/Chave.jsx';
import { mensagens } from '../../mensagens.js';
import estilos from './SemSessao.module.css';

// Sem token de sessão o front não fala com a API. Nunca tela em branco: diz o que fazer.
export default function SemSessao() {
  const m = mensagens.semSessao;
  return (
    <main className={estilos.tela}>
      <section className={estilos.painel} aria-labelledby="titulo-sem-sessao">
        <p className={estilos.marca}>{mensagens.app.nome}</p>
        <h1 id="titulo-sem-sessao">{m.titulo}</h1>
        <p className={estilos.texto}>{m.texto}</p>
        <Chave valor={m.comando} rotulo={m.comandoRotulo} />
      </section>
    </main>
  );
}
