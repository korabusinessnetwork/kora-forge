import { mensagens } from '../../../mensagens.js';
import estilos from './Campo.module.css';

// Atom. Rótulo, controle, microtexto obrigatório (diz o que o campo afeta) e erro junto do campo.
// Sem children renderiza um <input>; com children, o controle vem de fora e usa o mesmo id.
export default function Campo({ id, rotulo, microtexto, erro, padrao, mono = false, className, children, ...propsEntrada }) {
  if (!microtexto) throw new Error(`Campo "${id}" exige microtexto: diga o que o campo afeta no resultado.`);
  const idMicro = `${id}-microtexto`;
  const idErro = `${id}-erro`;
  const descritoPor = [idMicro, erro ? idErro : null].filter(Boolean).join(' ');
  const classesEntrada = [estilos.entrada, mono ? estilos.mono : null].filter(Boolean).join(' ');
  const sufixoPadrao = padrao !== undefined && padrao !== null ? ` ${mensagens.campo.padrao}: ${padrao}.` : '';

  return (
    <div className={[estilos.campo, className].filter(Boolean).join(' ')}>
      <label htmlFor={id} className={estilos.rotulo}>{rotulo}</label>
      {children ?? (
        <input id={id} className={classesEntrada} aria-describedby={descritoPor} aria-invalid={erro ? true : undefined} {...propsEntrada} />
      )}
      <p id={idMicro} className={estilos.micro}>{microtexto}{sufixoPadrao}</p>
      {erro ? <p id={idErro} role="alert" className={estilos.erro}>{erro}</p> : null}
    </div>
  );
}
