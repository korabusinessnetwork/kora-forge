import { useQuery } from '@tanstack/react-query';
import { obterSettings } from '../../services/settings.js';
import Botao from '../../components/shared/Botao/Botao.jsx';
import FormularioConfig from './FormularioConfig.jsx';
import { mensagens } from '../../mensagens.js';
import estilos from './PaginaConfig.module.css';

export default function PaginaConfig() {
  const consulta = useQuery({ queryKey: ['settings'], queryFn: obterSettings });
  return (
    <section className={estilos.pagina} aria-labelledby="titulo-config">
      <h1 id="titulo-config">{mensagens.config.titulo}</h1>

      {consulta.isPending ? <p role="status" className={estilos.estado}>{mensagens.estados.carregando}</p> : null}

      {consulta.isError ? (
        <div role="alert" className={estilos.erroPainel}>
          <p>{consulta.error?.message ?? mensagens.estados.erroGenerico}</p>
          <Botao variante="secundario" onClick={() => consulta.refetch()}>{mensagens.estados.tentarDeNovo}</Botao>
        </div>
      ) : null}

      {consulta.data ? <FormularioConfig inicial={consulta.data} /> : null}
    </section>
  );
}
