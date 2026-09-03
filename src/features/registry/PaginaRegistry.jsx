import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useHealth } from '../../hooks/useHealth.js';
import { listarProjetos } from '../../services/projetos.js';
import { listarPresets } from '../../services/presets.js';
import ListaProjetos from '../../components/registry/ListaProjetos/ListaProjetos.jsx';
import VazioRegistry from './VazioRegistry.jsx';
import { mensagens } from '../../mensagens.js';
import estilos from './PaginaRegistry.module.css';

const m = mensagens.registry;

export default function PaginaRegistry() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const busca = params.get('busca') ?? '';
  const health = useHealth();
  const projetos = useQuery({
    queryKey: ['projetos', { status, busca }],
    queryFn: () => listarProjetos({ status: status || undefined, busca: busca || undefined }),
  });
  const presets = useQuery({ queryKey: ['presets'], queryFn: listarPresets });

  const definirFiltro = (chave, valor) => {
    const novos = new URLSearchParams(params);
    if (valor) novos.set(chave, valor);
    else novos.delete(chave);
    setParams(novos, { replace: true });
  };

  const workspaceFalta = Boolean(health.data) && !health.data.workspace.configurado;

  return (
    <section className={estilos.pagina} aria-labelledby="titulo-registry">
      <div className={estilos.cabecalho}>
        <h1 id="titulo-registry">{m.titulo}</h1>
        <Link to="/novo" className={estilos.acaoPrimaria}>{m.novo}</Link>
      </div>

      {workspaceFalta ? (
        <p role="note" className={estilos.aviso}>
          {m.avisoWorkspace} <Link to="/config">{m.configurar}</Link>
        </p>
      ) : null}

      <ListaProjetos
        projetos={projetos.data ?? []}
        busca={busca}
        status={status}
        onBuscaChange={(valor) => definirFiltro('busca', valor)}
        onStatusChange={(valor) => definirFiltro('status', valor)}
        carregando={projetos.isPending}
        erro={projetos.isError ? (projetos.error?.message ?? mensagens.estados.erroGenerico) : null}
        onTentarDeNovo={() => projetos.refetch()}
        onLimparFiltros={() => setParams({}, { replace: true })}
        vazioInicial={<VazioRegistry presets={presets.data ?? []} />}
      />
    </section>
  );
}
