import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { estaAberto } from '@shared/reforja/estados.js';
import { listarMelhorias } from '../../services/reforja.js';
import { mensagens } from '../../mensagens.js';
import PainelDiagnostico from './PainelDiagnostico.jsx';
import CicloDoBacklog from './CicloDoBacklog.jsx';
import FormNovaMelhoria from './FormNovaMelhoria.jsx';
import PainelSugestoes from './PainelSugestoes.jsx';
import estilos from './PaginaReforja.module.css';

const m = mensagens.reforja;

// Auto-Reforja (ADR-014, fluxo F-11). O backlog é consultado aqui porque o diagnóstico precisa
// saber quais sinais já têm melhoria aberta; cada painel cuida dos próprios estados.
export default function PaginaReforja() {
  const itens = useQuery({ queryKey: ['reforja', 'itens'], queryFn: () => listarMelhorias() });

  const sinaisNoBacklog = useMemo(
    () => new Set((itens.data?.itens ?? []).filter((item) => item.sinal && estaAberto(item.estado)).map((item) => item.sinal)),
    [itens.data],
  );

  return (
    <section className={estilos.pagina} aria-labelledby="titulo-reforja">
      <div className={estilos.cabecalho}>
        <h1 id="titulo-reforja">{m.titulo}</h1>
        <p className={estilos.subtitulo}>{m.subtitulo}</p>
      </div>
      <PainelDiagnostico sinaisNoBacklog={sinaisNoBacklog} />
      <CicloDoBacklog consulta={itens} />
      <div className={estilos.dupla}>
        <FormNovaMelhoria />
        <PainelSugestoes />
      </div>
    </section>
  );
}
