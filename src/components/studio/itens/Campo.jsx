import estilos from './itens.module.css';

// Componente. Rótulo, entrada e microtexto, no padrão de campo do Kora. A entrada é só leitura e
// fora da tabulação: isto é o desenho de um campo, não um campo em uso.
export default function Campo({ props }) {
  return (
    <div className={estilos.campo}>
      <label className={estilos.rotulo}>
        {props.rotulo}
        <input className={estilos.entrada} type={props.tipo} aria-required={props.obrigatorio} readOnly tabIndex={-1} />
      </label>
      <p className={estilos.micro}>{props.microtexto}</p>
    </div>
  );
}
