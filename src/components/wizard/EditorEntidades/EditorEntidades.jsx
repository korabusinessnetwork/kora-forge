import Botao from '../../shared/Botao/Botao.jsx';
import Campo from '../../shared/Campo/Campo.jsx';
import ListaDeTextos from '../../shared/ListaDeTextos/ListaDeTextos.jsx';
import { mensagens } from '../../../mensagens.js';
import estilos from './EditorEntidades.module.css';

const m = mensagens.wizard.passos.dados;

// Molecule. Entidades do domínio: nome, o que é, e os campos. Vazio traz a próxima ação.
export default function EditorEntidades({ entidades = [], onChange }) {
  const alterar = (indice, parcial) => onChange(entidades.map((entidade, i) => (i === indice ? { ...entidade, ...parcial } : entidade)));
  const remover = (indice) => onChange(entidades.filter((_, i) => i !== indice));
  const adicionar = () => onChange([...entidades, { nome: '', descricao: '', campos: [] }]);

  return (
    <div className={estilos.editor}>
      {entidades.length === 0 ? <p className={estilos.vazio}>{m.vazio}</p> : null}

      {entidades.map((entidade, indice) => (
        <fieldset key={indice} className={estilos.entidade}>
          <legend className={estilos.legenda}>{entidade.nome || `#${indice + 1}`}</legend>
          <Campo
            id={`entidade-${indice}-nome`}
            rotulo={m.nome.rotulo}
            microtexto={m.entidades.micro}
            placeholder={m.nome.placeholder}
            value={entidade.nome}
            onChange={(evento) => alterar(indice, { nome: evento.target.value })}
            autoComplete="off"
          />
          <Campo
            id={`entidade-${indice}-descricao`}
            rotulo={m.descricao.rotulo}
            microtexto={m.entidades.micro}
            placeholder={m.descricao.placeholder}
            value={entidade.descricao}
            onChange={(evento) => alterar(indice, { descricao: evento.target.value })}
            autoComplete="off"
          />
          <ListaDeTextos
            id={`entidade-${indice}-campos`}
            rotulo={m.campos.rotulo}
            microtexto={m.campos.micro}
            placeholder={m.campos.placeholder}
            itens={entidade.campos}
            onChange={(campos) => alterar(indice, { campos })}
          />
          <div>
            <Botao variante="fantasma" onClick={() => remover(indice)}>{m.remover}</Botao>
          </div>
        </fieldset>
      ))}

      <div>
        <Botao variante="secundario" onClick={adicionar}>{m.adicionar}</Botao>
      </div>
    </div>
  );
}
