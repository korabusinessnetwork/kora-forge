import Botao from '../../shared/Botao/Botao.jsx';
import { mensagens } from '../../../mensagens.js';
import estilos from './PassoWizard.module.css';

// Organism. Casca de uma etapa: título, microtexto, campos, avisos, navegação e pular.
// A região de avisos existe desde já; o motor de regras (bloco 5) a preenche.
export default function PassoWizard({
  titulo, microtexto, indice, total, avisos = [], podePular, salvando, erro,
  onVoltar, onAvancar, onPular, onTentarDeNovo, children,
}) {
  const m = mensagens.wizard;
  const ultima = indice === total - 1;
  return (
    <section className={estilos.passo} aria-labelledby="titulo-etapa">
      <header className={estilos.cabecalho}>
        <p className={estilos.contador}>{m.etapaXdeY(indice + 1, total)}</p>
        <h1 id="titulo-etapa">{titulo}</h1>
        <p className={estilos.microtexto}>{microtexto}</p>
      </header>

      {avisos.length > 0 ? (
        <div className={estilos.avisos} role="region" aria-label={m.avisos}>
          {avisos}
        </div>
      ) : null}

      <div className={estilos.campos}>{children}</div>

      {erro ? (
        <div role="alert" className={estilos.erro}>
          <p>{erro}</p>
          <Botao variante="secundario" onClick={onTentarDeNovo}>{mensagens.estados.tentarDeNovo}</Botao>
        </div>
      ) : null}

      <footer className={estilos.rodape}>
        <div className={estilos.esquerda}>
          {onVoltar ? <Botao variante="fantasma" onClick={onVoltar} desabilitado={salvando}>{m.voltar}</Botao> : null}
          {podePular ? <Botao variante="fantasma" onClick={onPular} desabilitado={salvando}>{m.pular}</Botao> : null}
        </div>
        <Botao onClick={onAvancar} carregando={salvando}>{ultima ? m.concluir : m.avancar}</Botao>
      </footer>
      <p className={estilos.nota}>{m.notaSalvamento}</p>
    </section>
  );
}
