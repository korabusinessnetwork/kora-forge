import { useState } from 'react';
import Botao from '../Botao/Botao.jsx';
import { mensagens } from '../../../mensagens.js';
import estilos from './ListaDeTextos.module.css';

// Atom. Lista editável de strings (personas, não-objetivos, stack, compliance).
// Microtexto é obrigatório, como em `Campo`: o usuário precisa saber o que aquilo afeta.
export default function ListaDeTextos({ id, rotulo, microtexto, itens = [], onChange, placeholder, vazio }) {
  if (!microtexto) throw new Error(`ListaDeTextos "${id}" exige microtexto: diga o que a lista afeta no resultado.`);
  const m = mensagens.lista;
  const [novo, setNovo] = useState('');

  const adicionar = () => {
    const texto = novo.trim();
    if (!texto) return;
    onChange([...itens, texto]);
    setNovo('');
  };

  const remover = (indice) => onChange(itens.filter((_, i) => i !== indice));

  const alterar = (indice, valor) => onChange(itens.map((item, i) => (i === indice ? valor : item)));

  return (
    <fieldset className={estilos.grupo}>
      <legend className={estilos.rotulo}>{rotulo}</legend>
      <p id={`${id}-microtexto`} className={estilos.micro}>{microtexto}</p>

      {itens.length === 0 ? <p className={estilos.vazio}>{vazio ?? m.vazio}</p> : (
        <ul className={estilos.itens}>
          {itens.map((item, indice) => (
            <li key={indice} className={estilos.item}>
              <input
                className={estilos.entrada}
                aria-label={`${rotulo} ${indice + 1}`}
                value={item}
                onChange={(evento) => alterar(indice, evento.target.value)}
              />
              <Botao variante="fantasma" onClick={() => remover(indice)} aria-label={`${m.remover} ${item || indice + 1}`}>{m.remover}</Botao>
            </li>
          ))}
        </ul>
      )}

      <div className={estilos.adicionar}>
        <input
          id={id}
          className={estilos.entrada}
          aria-describedby={`${id}-microtexto`}
          aria-label={m.novoItem(rotulo)}
          placeholder={placeholder}
          value={novo}
          onChange={(evento) => setNovo(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter') {
              evento.preventDefault();
              adicionar();
            }
          }}
        />
        <Botao variante="secundario" onClick={adicionar} desabilitado={novo.trim() === ''}>{m.adicionar}</Botao>
      </div>
    </fieldset>
  );
}
