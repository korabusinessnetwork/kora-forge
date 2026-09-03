import { useState } from 'react';
import Botao from '../../shared/Botao/Botao.jsx';
import Campo from '../../shared/Campo/Campo.jsx';
import Selo from '../../shared/Selo/Selo.jsx';
import { mensagens } from '../../../mensagens.js';
import estilos from './AvisoRegra.module.css';

const m = mensagens.regras;
const TAMANHO_MINIMO = 10;

// Molecule. Um hit do motor de regras, junto do campo que o causou (P-08, RN-04).
// A ação disponível depende da regra: automática não pede nada, dispensável pede justificativa.
export default function AvisoRegra({ hit, onDecidir, salvando, erro }) {
  const [dispensando, setDispensando] = useState(false);
  const [justificativa, setJustificativa] = useState('');
  const [erroLocal, setErroLocal] = useState(null);

  const decidido = hit.estado === 'dispensado' || hit.estado === 'ignorado';
  const automatico = hit.resolucao === 'automatica';

  const confirmar = (evento) => {
    evento.preventDefault();
    if (justificativa.trim().length < TAMANHO_MINIMO) {
      setErroLocal(m.justificativa.curta);
      return;
    }
    setErroLocal(null);
    onDecidir({ estado: 'dispensado', justificativa: justificativa.trim() });
  };

  return (
    <section className={[estilos.aviso, estilos[hit.severidade]].join(' ')} aria-labelledby={`aviso-${hit.id}`}>
      <p className={estilos.topo}>
        <Selo estado={hit.severidade === 'bloqueio' ? 'invalida' : 'rascunho'}>{m.severidade[hit.severidade]}</Selo>
        <strong id={`aviso-${hit.id}`} className={estilos.titulo}>{hit.titulo}</strong>
      </p>
      <p className={estilos.explicacao}>{hit.explicacao}</p>

      {automatico ? <p className={estilos.nota}>{m.automatico}</p> : null}
      {hit.estado === 'dispensado' ? <p className={estilos.nota}>{m.dispensado}: {hit.justificativa}</p> : null}
      {hit.estado === 'ignorado' ? <p className={estilos.nota}>{m.ignorado}</p> : null}

      {dispensando ? (
        <form className={estilos.formulario} onSubmit={confirmar} noValidate>
          <Campo
            id={`justificativa-${hit.id}`}
            rotulo={m.justificativa.rotulo}
            microtexto={m.justificativa.micro}
            erro={erroLocal ?? erro}
            value={justificativa}
            onChange={(evento) => setJustificativa(evento.target.value)}
            autoComplete="off"
          />
          <div className={estilos.acoes}>
            <Botao tipo="submit" variante="secundario" carregando={salvando}>{m.confirmarDispensa}</Botao>
            <Botao variante="fantasma" onClick={() => { setDispensando(false); setErroLocal(null); }}>{m.cancelar}</Botao>
          </div>
        </form>
      ) : (
        <div className={estilos.acoes}>
          {!automatico && !decidido && hit.dispensavel ? <Botao variante="secundario" onClick={() => setDispensando(true)}>{m.dispensar}</Botao> : null}
          {!automatico && !decidido && !hit.dispensavel && hit.severidade === 'info' ? <Botao variante="fantasma" carregando={salvando} onClick={() => onDecidir({ estado: 'ignorado' })}>{m.ignorar}</Botao> : null}
          {decidido ? <Botao variante="fantasma" carregando={salvando} onClick={() => onDecidir({ estado: 'aberto' })}>{m.reabrir}</Botao> : null}
        </div>
      )}
    </section>
  );
}
