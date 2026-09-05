import { variaveisDoPreview } from '../../../features/studio/campos.js';
import { mensagens } from '../../../mensagens.js';
import estilos from './PreviewProjeto.module.css';

const m = mensagens.studio.preview;

// Organism. O container isolado do Studio (P-06). Recebe os tokens como dado e os aplica como
// custom properties no próprio elemento, com o alias `--projeto-*`.
//
// Este é o único ponto do produto que monta estilo em tempo de execução, e a razão é que valor de
// token é dado: não existe arquivo estático que saiba de antemão a cor que a pessoa vai escolher.
// A exceção fica aqui e só aqui. Todo o resto é CSS Module, como qualquer componente.
//
// O preview declara fundo, cor e fonte em vez de herdar os da ferramenta, senão mostraria o
// projeto com a cara do Forge e mentiria sobre o que vai sair no disco. Pelo mesmo motivo, nenhum
// `--forge-*` entra aqui: a moldura em volta é da página, este arquivo é só o palco.
export default function PreviewProjeto({ tokens }) {
  return (
    <div className={estilos.palco} style={variaveisDoPreview(tokens)} role="region" aria-label={m.regiao}>
      <h3 className={estilos.titulo}>{m.amostra.titulo}</h3>
      <p className={estilos.secundario}>{m.amostra.secundario}</p>

      <div className={estilos.botoes}>
        <span className={estilos.botao}>{m.amostra.botao}</span>
        <span className={estilos.botaoSecundario}>{m.amostra.botaoSecundario}</span>
      </div>

      <div className={estilos.cartao}>
        <p className={estilos.cartaoTitulo}>{m.amostra.cartaoTitulo}</p>
        <p className={estilos.secundario}>{m.amostra.cartaoTexto}</p>
      </div>

      <div className={estilos.campo}>
        <span className={estilos.campoRotulo}>{m.amostra.campoRotulo}</span>
        <span className={estilos.campoEntrada}>{m.amostra.campoPlaceholder}</span>
      </div>

      <p className={estilos.mono}>{m.amostra.mono}</p>

      <div className={estilos.estados}>
        <span className={estilos.sucesso}>{m.amostra.estados.sucesso}</span>
        <span className={estilos.aviso}>{m.amostra.estados.aviso}</span>
        <span className={estilos.perigo}>{m.amostra.estados.perigo}</span>
      </div>
    </div>
  );
}
