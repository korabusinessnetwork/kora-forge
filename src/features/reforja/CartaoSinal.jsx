import Botao from '../../components/shared/Botao/Botao.jsx';
import { mensagens } from '../../mensagens.js';
import SeloSeveridade from './SeloSeveridade.jsx';
import estilos from './CartaoSinal.module.css';

const m = mensagens.reforja;

// Um sinal do diagnóstico: o que foi achado, onde, o que fazer, e o atalho para virar melhoria.
export default function CartaoSinal({ sinal, jaNoBacklog, transformando, onTransformar }) {
  const idTitulo = `sinal-${sinal.id}`;
  return (
    <article className={estilos.cartao} aria-labelledby={idTitulo} data-sinal={sinal.id}>
      <header className={estilos.cabecalho}>
        <SeloSeveridade nivel={sinal.severidade} />
        <h3 id={idTitulo} className={estilos.titulo}>{sinal.titulo}</h3>
        <span className={estilos.numeros}>
          {m.diagnostico.arquivos(sinal.total)} · {sinal.ocorrencias} {m.unidades[sinal.unidade] ?? sinal.unidade}
        </span>
      </header>

      <p className={estilos.sugestao}>{sinal.sugestao}</p>

      <details className={estilos.evidencias}>
        <summary>{m.diagnostico.evidencias}</summary>
        <ul className={estilos.lista}>
          {sinal.evidencias.map((evidencia) => (
            <li key={evidencia.arquivo} className={estilos.evidencia}>
              <span className={estilos.caminho}>{evidencia.arquivo}</span>
              {evidencia.contagem !== null ? <span className={estilos.contagem}>{evidencia.contagem}</span> : null}
            </li>
          ))}
        </ul>
        {sinal.evidenciasOcultas > 0 ? <p className={estilos.ocultas}>{m.diagnostico.evidenciasOcultas(sinal.evidenciasOcultas)}</p> : null}
      </details>

      <div className={estilos.acoes}>
        <Botao
          variante="secundario"
          desabilitado={jaNoBacklog}
          carregando={transformando}
          onClick={() => onTransformar(sinal.id)}
        >
          {jaNoBacklog ? m.diagnostico.jaNoBacklog : m.diagnostico.transformar}
        </Botao>
      </div>
    </article>
  );
}
