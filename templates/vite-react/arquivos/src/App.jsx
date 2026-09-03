import estilos from './App.module.css';

// {{PROJETO}}. Primeira tela: substitua por algo real assim que a primeira feature existir.
// O que este produto faz: {{ESSENCIA}}
export default function App() {
  return (
    <main className={estilos.tela}>
      <h1>{{PROJETO}}</h1>
      <p className={estilos.texto}>{{ESSENCIA}}</p>
      <p className={estilos.nota}>
        Comece por <code>CLAUDE.md</code> e <code>docs/00_VISAO</code>. A primeira tarefa está em{' '}
        <code>docs/09_BACKLOG</code>.
      </p>
    </main>
  );
}
