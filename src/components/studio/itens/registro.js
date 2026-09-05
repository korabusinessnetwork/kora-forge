import Botao from './Botao.jsx';
import Cabecalho from './Cabecalho.jsx';
import Campo from './Campo.jsx';
import Cartao from './Cartao.jsx';
import Imagem from './Imagem.jsx';
import Rodape from './Rodape.jsx';
import Secao from './Secao.jsx';
import Texto from './Texto.jsx';
import Titulo from './Titulo.jsx';

// Id do catálogo → componente que o desenha no canvas. O `arquivo` está aqui porque é o endereço
// que a guarda de sincronia lê: ela abre o código-fonte de cada renderizador e confere, contra o
// catálogo real, quais props ele consome. Derivar o nome do arquivo por convenção funcionaria hoje
// e quebraria no primeiro item cujo nome não é o id em PascalCase.
export const RENDERIZADORES = Object.freeze({
  cabecalho: { componente: Cabecalho, arquivo: 'Cabecalho.jsx' },
  secao: { componente: Secao, arquivo: 'Secao.jsx' },
  rodape: { componente: Rodape, arquivo: 'Rodape.jsx' },
  titulo: { componente: Titulo, arquivo: 'Titulo.jsx' },
  texto: { componente: Texto, arquivo: 'Texto.jsx' },
  botao: { componente: Botao, arquivo: 'Botao.jsx' },
  imagem: { componente: Imagem, arquivo: 'Imagem.jsx' },
  campo: { componente: Campo, arquivo: 'Campo.jsx' },
  cartao: { componente: Cartao, arquivo: 'Cartao.jsx' },
});

// `null` para tipo que saiu do catálogo. Quem chama desenha a caixa de item desconhecido, em vez
// de inventar aparência para algo que este Forge não sabe o que é.
export function renderizadorDe(tipo) {
  return RENDERIZADORES[tipo]?.componente ?? null;
}
