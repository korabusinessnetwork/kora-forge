import { variaveisDoPreview } from '../../../features/studio/campos.js';
import estilos from './PalcoProjeto.module.css';

// O container isolado do Studio (P-06), usado pelo preview de tokens e pelo canvas. Recebe os
// tokens como dado e os aplica como custom properties no próprio elemento, com o alias
// `--projeto-*`.
//
// Este é o único ponto do produto que monta estilo em tempo de execução, e a razão é que valor de
// token é dado: não existe arquivo estático que saiba de antemão a cor que a pessoa vai escolher.
// A exceção fica aqui e só aqui. Todo o resto é CSS Module, como qualquer componente.
//
// O palco declara fundo, cor e fonte em vez de herdar os da ferramenta, senão mostraria o projeto
// com a cara do Forge e mentiria sobre o que vai sair no disco. Pelo mesmo motivo, nenhum
// `--forge-*` entra aqui: a moldura em volta é de quem usa o palco, este arquivo é só o chão.
export default function PalcoProjeto({ tokens, rotulo, className, children }) {
  return (
    <div
      className={[estilos.palco, className].filter(Boolean).join(' ')}
      style={variaveisDoPreview(tokens)}
      role="region"
      aria-label={rotulo}
    >
      {children}
    </div>
  );
}
