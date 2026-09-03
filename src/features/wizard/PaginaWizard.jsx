import { Link, Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { obterProjeto } from '../../services/projetos.js';
import { obterPreset } from '../../services/presets.js';
import { avaliarRegras } from '../../services/regras.js';
import Botao from '../../components/shared/Botao/Botao.jsx';
import ConteudoWizard from './ConteudoWizard.jsx';
import { mensagens } from '../../mensagens.js';
import estilos from './PaginaWizard.module.css';

// Carrega projeto e preset, resolve a etapa da URL e entrega a condução ao ConteudoWizard.
// A etapa vem sempre do preset: o wizard é conduzido por dado, nunca por código (ADR-007).
export default function PaginaWizard() {
  const { id, etapa } = useParams();
  const projetoQuery = useQuery({ queryKey: ['projeto', id], queryFn: () => obterProjeto(id) });
  const presetId = projetoQuery.data?.projeto.presetId;
  const presetQuery = useQuery({ queryKey: ['preset', presetId], queryFn: () => obterPreset(presetId), enabled: Boolean(presetId) });
  const regrasQuery = useQuery({ queryKey: ['regras', id], queryFn: () => avaliarRegras(id), enabled: Boolean(projetoQuery.data) });

  // Erro antes de carregando: com o projeto em erro, a consulta do preset fica desabilitada e
  // presa em "pending", e checar carregando primeiro prenderia a tela num spinner mudo.
  const erro = projetoQuery.error ?? presetQuery.error;
  if (erro) {
    const naoEncontrado = erro.codigo === 'FORGE_NOT_FOUND';
    return (
      <div role="alert" className={estilos.erro}>
        <p>{naoEncontrado ? mensagens.projeto.naoEncontrado : (erro.message ?? mensagens.estados.erroGenerico)}</p>
        {naoEncontrado
          ? <Link to="/">{mensagens.projeto.voltar}</Link>
          : <Botao variante="secundario" onClick={() => { projetoQuery.refetch(); presetQuery.refetch(); }}>{mensagens.estados.tentarDeNovo}</Botao>}
      </div>
    );
  }

  if (projetoQuery.isPending || presetQuery.isPending) {
    return <p role="status" className={estilos.estado}>{mensagens.estados.carregando}</p>;
  }

  const { projeto, blueprint } = projetoQuery.data;
  const preset = presetQuery.data;

  if (projeto.status === 'arquivado') {
    return (
      <div role="alert" className={estilos.erro}>
        <h1>{mensagens.wizard.arquivado.titulo}</h1>
        <p>{mensagens.wizard.arquivado.texto}</p>
        <Link to={`/projetos/${projeto.id}`}>{mensagens.projeto.voltar}</Link>
      </div>
    );
  }

  // Sem etapa na URL, ou com etapa fora do preset: retoma exatamente onde parou (RN-03.4).
  const etapaValida = etapa && preset.etapas.includes(etapa);
  if (!etapaValida) {
    const destino = preset.etapas.includes(blueprint.payload.etapaAtual) ? blueprint.payload.etapaAtual : preset.etapas[0];
    return <Navigate to={`/projetos/${projeto.id}/wizard/${destino}`} replace />;
  }

  // Bloqueio aberto impede chegar em Materializar (F-01). URL direta volta para a etapa do
  // primeiro bloqueio, para o usuário cair exatamente onde o problema está.
  const avaliacao = regrasQuery.data ?? null;
  if (etapa === 'materializar' && avaliacao && !avaliacao.podeMaterializar) {
    const primeiro = avaliacao.hits.find((hit) => hit.severidade === 'bloqueio' && hit.estado === 'aberto');
    const destino = primeiro?.etapa && preset.etapas.includes(primeiro.etapa) ? primeiro.etapa : blueprint.payload.etapaAtual;
    if (destino !== 'materializar') return <Navigate to={`/projetos/${projeto.id}/wizard/${destino}`} replace />;
  }

  return <ConteudoWizard projeto={projeto} blueprint={blueprint} preset={preset} etapa={etapa} avaliacao={avaliacao} />;
}
