import estilos from './Botao.module.css';

// Atom. Variantes: primario, secundario, fantasma, destrutivo. Estado carregando embutido.
export default function Botao({ variante = 'primario', carregando = false, tipo = 'button', desabilitado = false, className, children, ...resto }) {
  const classes = [estilos.botao, estilos[variante] ?? estilos.primario, className].filter(Boolean).join(' ');
  return (
    <button type={tipo} className={classes} disabled={desabilitado || carregando} aria-busy={carregando || undefined} {...resto}>
      {carregando ? <span className={estilos.spinner} aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
}
