import { Link } from 'react-router-dom';
import { useHealth } from '../../hooks/useHealth.js';
import Botao from '../../components/shared/Botao/Botao.jsx';
import Chave from '../../components/shared/Chave/Chave.jsx';
import { mensagens } from '../../mensagens.js';
import estilos from './PaginaInicio.module.css';

const m = mensagens.inicio;
const TEXTO_COFRE = { ausente: m.cofreAusente, trancado: m.cofreTrancado, destrancado: m.cofreDestrancado };

export default function PaginaInicio() {
  const { data, isPending, isError, error, refetch } = useHealth();
  return (
    <section className={estilos.pagina} aria-labelledby="titulo-inicio">
      <h1 id="titulo-inicio">{m.titulo}</h1>

      {isPending ? <p role="status" className={estilos.estado}>{mensagens.estados.carregando}</p> : null}

      {isError ? (
        <div role="alert" className={estilos.erro}>
          <p>{error?.message ?? mensagens.estados.erroGenerico}</p>
          <Botao variante="secundario" onClick={() => refetch()}>{mensagens.estados.tentarDeNovo}</Botao>
        </div>
      ) : null}

      {data ? (
        <dl className={estilos.cartoes}>
          <div className={estilos.cartao}>
            <dt>{m.versao}</dt>
            <dd><Chave valor={data.versao} rotulo={m.versao} /></dd>
          </div>
          <div className={estilos.cartao}>
            <dt>{m.workspace}</dt>
            <dd>
              {data.workspace.configurado ? (
                <Chave valor={data.workspace.caminho} rotulo={m.workspace} />
              ) : (
                <>
                  <p className={estilos.vazio}>{m.workspaceVazio}</p>
                  <Link to="/config" className={estilos.acao}>{m.configurar}</Link>
                </>
              )}
            </dd>
          </div>
          <div className={estilos.cartao}>
            <dt>{m.cofre}</dt>
            <dd>{TEXTO_COFRE[data.cofre]}</dd>
          </div>
          <div className={estilos.cartao}>
            <dt>{m.copiloto}</dt>
            <dd>{data.copiloto.ligado ? m.copilotoLigado : m.copilotoDesligado}</dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}
