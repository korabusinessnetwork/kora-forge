import { STATUS_PROJETO } from '@shared/schemas/projeto.js';
import Botao from '../../shared/Botao/Botao.jsx';
import Campo from '../../shared/Campo/Campo.jsx';
import Selecao from '../../shared/Selecao/Selecao.jsx';
import CartaoProjeto from '../CartaoProjeto/CartaoProjeto.jsx';
import { mensagens } from '../../../mensagens.js';
import estilos from './ListaProjetos.module.css';

// Organism. Registry com busca e filtro por status. Quatro estados, mais "sem resultado".
export default function ListaProjetos({
  projetos, busca, status, onBuscaChange, onStatusChange, carregando, erro, onTentarDeNovo, onLimparFiltros, vazioInicial,
}) {
  const m = mensagens.registry;
  const filtrando = Boolean(busca) || Boolean(status);
  const opcoesStatus = [
    { valor: '', rotulo: m.filtro.ativos, padraoKora: true },
    ...STATUS_PROJETO.map((valor) => ({ valor, rotulo: m.filtro[valor] })),
  ];

  if (!carregando && !erro && !filtrando && projetos.length === 0) {
    return <div className={estilos.vazio}>{vazioInicial}</div>;
  }

  return (
    <section className={estilos.lista}>
      <div className={estilos.barra}>
        <Campo
          id="busca"
          rotulo={m.busca.rotulo}
          microtexto={m.busca.micro}
          placeholder={m.busca.placeholder}
          type="search"
          value={busca}
          onChange={(evento) => onBuscaChange(evento.target.value)}
          autoComplete="off"
        />
        <Campo id="status" rotulo={m.filtro.rotulo} microtexto={m.filtro.micro}>
          <Selecao id="status" valor={status} onChange={onStatusChange} opcoes={opcoesStatus} />
        </Campo>
      </div>

      {carregando ? <p role="status" className={estilos.estado}>{mensagens.estados.carregando}</p> : null}

      {erro ? (
        <div role="alert" className={estilos.erro}>
          <p>{erro}</p>
          <Botao variante="secundario" onClick={onTentarDeNovo}>{mensagens.estados.tentarDeNovo}</Botao>
        </div>
      ) : null}

      {!carregando && !erro && filtrando && projetos.length === 0 ? (
        <div className={estilos.semResultado}>
          <h2>{m.semResultado.titulo}</h2>
          <p className={estilos.estado}>{m.semResultado.texto}</p>
          <Botao variante="secundario" onClick={onLimparFiltros}>{m.semResultado.limpar}</Botao>
        </div>
      ) : null}

      {projetos.length > 0 ? (
        <ul className={estilos.cartoes}>
          {projetos.map((projeto) => (
            <li key={projeto.id}><CartaoProjeto projeto={projeto} /></li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
