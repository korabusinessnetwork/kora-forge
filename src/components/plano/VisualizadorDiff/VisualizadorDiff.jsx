import { useState } from 'react';
import Botao from '../../shared/Botao/Botao.jsx';
import estilos from './VisualizadorDiff.module.css';

function linhasDoDiff(anterior, proposto) {
  const antes = String(anterior ?? '').split('\n');
  const depois = String(proposto ?? '').split('\n');
  let inicio = 0;
  while (inicio < antes.length && inicio < depois.length && antes[inicio] === depois[inicio]) inicio += 1;
  let fimAntes = antes.length - 1;
  let fimDepois = depois.length - 1;
  while (fimAntes >= inicio && fimDepois >= inicio && antes[fimAntes] === depois[fimDepois]) {
    fimAntes -= 1;
    fimDepois -= 1;
  }
  return [
    ...antes.slice(0, inicio).map((texto) => ({ tipo: 'igual', texto })),
    ...antes.slice(inicio, fimAntes + 1).map((texto) => ({ tipo: 'removida', texto })),
    ...depois.slice(inicio, fimDepois + 1).map((texto) => ({ tipo: 'adicionada', texto })),
    ...antes.slice(fimAntes + 1).map((texto) => ({ tipo: 'igual', texto })),
  ];
}

export default function VisualizadorDiff({ arquivo }) {
  const [aberto, setAberto] = useState(false);
  const linhas = aberto ? linhasDoDiff(arquivo.conteudoAtual, arquivo.conteudo) : [];
  return (
    <section className={estilos.bloco} aria-label={`Diferenças em ${arquivo.caminho}`}>
      <Botao variante="secundario" onClick={() => setAberto((atual) => !atual)}>
        {aberto ? 'Fechar diferenças' : 'Ver diferenças'}
      </Botao>
      {aberto ? (
        <pre className={estilos.diff} aria-live="polite">
          {linhas.map((linha, indice) => (
            <code key={`${linha.tipo}-${indice}`} className={estilos[linha.tipo]}>
              {linha.tipo === 'removida' ? '− ' : linha.tipo === 'adicionada' ? '+ ' : '  '}{linha.texto}{'\n'}
            </code>
          ))}
        </pre>
      ) : null}
    </section>
  );
}

export { linhasDoDiff };
