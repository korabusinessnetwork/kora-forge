import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { etapaEstaCompleta, podePular, proximaEtapa, etapaAnterior } from '@shared/etapas.js';
import { salvarBlueprint, atualizarProjeto } from '../../services/projetos.js';
import { decidirSobreHit } from '../../services/regras.js';
import PassoWizard from '../../components/wizard/PassoWizard/PassoWizard.jsx';
import TrilhaEtapas from '../../components/wizard/TrilhaEtapas/TrilhaEtapas.jsx';
import AvisosDoCampo from '../../components/wizard/AvisosDoCampo/AvisosDoCampo.jsx';
import { respostasIniciais, defaultsDaEtapa } from './defaults.js';
import { limparRespostas, saoIguais } from './comparar.js';
import Identidade from './etapas/Identidade.jsx';
import Escopo from './etapas/Escopo.jsx';
import Arquitetura from './etapas/Arquitetura.jsx';
import Dados from './etapas/Dados.jsx';
import Seguranca from './etapas/Seguranca.jsx';
import Fundacao from './etapas/Fundacao.jsx';
import Materializar from './etapas/Materializar.jsx';
import EtapaFutura from './etapas/EtapaFutura.jsx';
import { mensagens } from '../../mensagens.js';
import estilos from './PaginaWizard.module.css';

const COMPONENTE_POR_ETAPA = { identidade: Identidade, escopo: Escopo, arquitetura: Arquitetura, dados: Dados, seguranca: Seguranca, fundacao: Fundacao, materializar: Materializar };

const semDuplicar = (lista, etapa) => lista.filter((item) => item !== etapa);

export default function ConteudoWizard({ projeto, blueprint, preset, etapa, avaliacao = null }) {
  const navegar = useNavigate();
  const clienteQuery = useQueryClient();
  const [respostas, setRespostas] = useState(() => respostasIniciais(blueprint.payload, preset, projeto));
  const [concluidas, setConcluidas] = useState(blueprint.payload.etapasConcluidas);
  const [assumidas, setAssumidas] = useState(blueprint.payload.assumidas);
  const [erroNome, setErroNome] = useState(null);
  const [erroBloqueio, setErroBloqueio] = useState(null);

  const etapas = preset.etapas;
  const indice = etapas.indexOf(etapa);
  const m = mensagens.wizard;
  const textos = m.passos[etapa] ?? m.passos.futura[etapa];

  const salvar = useMutation({
    mutationFn: async ({ payload, nome }) => {
      if (nome !== undefined && nome !== projeto.nome) await atualizarProjeto(projeto.id, { nome });
      if (payload) return salvarBlueprint(projeto.id, payload);
      return null;
    },
    onSuccess: (dados, variaveis) => {
      if (dados) clienteQuery.setQueryData(['projeto', projeto.id], dados);
      clienteQuery.invalidateQueries({ queryKey: ['projeto', projeto.id] });
      clienteQuery.invalidateQueries({ queryKey: ['projetos'] });
      clienteQuery.invalidateQueries({ queryKey: ['regras', projeto.id] });
      navegar(variaveis.destino);
    },
  });

  function montarPayload({ etapaDestino, novasConcluidas, novasAssumidas, novasRespostas }) {
    return {
      preset: { id: preset.id, versao: preset.versao },
      etapaAtual: etapaDestino,
      etapasConcluidas: novasConcluidas,
      assumidas: novasAssumidas,
      respostas: limparRespostas(novasRespostas, etapas),
    };
  }

  // Só cria versão nova quando algo mudou de fato. Navegar não é editar (RN-02, princípio nº 2).
  function comitar({ etapaDestino, novasConcluidas = concluidas, novasAssumidas = assumidas, novasRespostas = respostas, rota }) {
    const payload = montarPayload({ etapaDestino, novasConcluidas, novasAssumidas, novasRespostas });
    const nome = novasRespostas.identidade?.nome;
    const nomeMudou = etapas.includes('identidade') && typeof nome === 'string' && nome.trim() !== '' && nome.trim() !== projeto.nome;
    const blueprintMudou = !saoIguais(payload, blueprint.payload);
    const destino = rota ?? `/projetos/${projeto.id}/wizard/${etapaDestino}`;

    setConcluidas(novasConcluidas);
    setAssumidas(novasAssumidas);
    setRespostas(novasRespostas);

    if (!blueprintMudou && !nomeMudou) {
      navegar(destino);
      return;
    }
    salvar.mutate({ payload: blueprintMudou ? payload : null, nome: nomeMudou ? nome.trim() : undefined, destino });
  }

  const decidir = useMutation({
    mutationFn: ({ hit, patch }) => decidirSobreHit(projeto.id, hit.id, patch),
    onSuccess: (dados) => clienteQuery.setQueryData(['regras', projeto.id], dados),
  });

  const hits = avaliacao?.hits ?? [];
  const visiveis = hits.filter((hit) => hit.estado !== 'resolvido' || hit.resolucao === 'automatica');
  const daEtapa = visiveis.filter((hit) => hit.etapa === etapa);
  const avisosDoCampo = (campo) => daEtapa.filter((hit) => hit.campo === campo);
  const avisosDoTopo = daEtapa.filter((hit) => !hit.campo);
  const bloqueado = Boolean(avaliacao) && !avaliacao.podeMaterializar;

  function decidirSobre(hit, patch) {
    decidir.mutate({ hit, patch });
  }

  function avancar() {
    if (etapa === 'identidade' && (respostas.identidade?.nome ?? '').trim() === '') {
      setErroNome(m.passos.identidade.nomeVazio);
      return;
    }
    setErroNome(null);
    const seguinteEtapa = proximaEtapa(etapas, etapa);
    // Bloqueio aberto impede chegar em Materializar. Salva o que foi digitado e fica na etapa,
    // em vez de descartar o trabalho junto com a navegação.
    if (seguinteEtapa === 'materializar' && bloqueado) {
      setErroBloqueio(mensagens.regras.bloqueioMaterializar);
      comitar({ etapaDestino: etapa, rota: `/projetos/${projeto.id}/wizard/${etapa}` });
      return;
    }
    setErroBloqueio(null);
    const completa = etapaEstaCompleta(etapa, respostas);
    const novasConcluidas = completa ? [...semDuplicar(concluidas, etapa), etapa] : semDuplicar(concluidas, etapa);
    const seguinte = proximaEtapa(etapas, etapa);
    comitar({
      etapaDestino: seguinte ?? etapa,
      novasConcluidas,
      novasAssumidas: semDuplicar(assumidas, etapa),
      rota: seguinte ? undefined : `/projetos/${projeto.id}`,
    });
  }

  function pular() {
    const seguinte = proximaEtapa(etapas, etapa);
    comitar({
      etapaDestino: seguinte ?? etapa,
      novasConcluidas: semDuplicar(concluidas, etapa),
      novasAssumidas: [...semDuplicar(assumidas, etapa), etapa],
      novasRespostas: { ...respostas, [etapa]: defaultsDaEtapa(etapa, preset, projeto) },
      rota: seguinte ? undefined : `/projetos/${projeto.id}`,
    });
  }

  function irPara(destinoEtapa) {
    if (destinoEtapa === etapa) return;
    comitar({ etapaDestino: destinoEtapa });
  }

  const Componente = COMPONENTE_POR_ETAPA[etapa];
  const valor = respostas[etapa] ?? {};
  const anterior = etapaAnterior(etapas, etapa);

  return (
    <div className={estilos.casca}>
      <TrilhaEtapas etapas={etapas} atual={etapa} concluidas={concluidas} assumidas={assumidas} bloqueadas={bloqueado ? ['materializar'] : []} onIr={irPara} />
      <PassoWizard
        titulo={textos.titulo}
        microtexto={textos.micro}
        indice={indice}
        total={etapas.length}
        podePular={podePular(etapa)}
        salvando={salvar.isPending}
        avisos={avisosDoTopo.map((hit) => (
          <AvisosDoCampo key={hit.id} avisos={[hit]} onDecidir={decidirSobre} salvando={decidir.isPending} erro={decidir.isError ? decidir.error?.detalhe?.issues?.[0]?.mensagem : null} />
        ))}
        erro={erroBloqueio ?? (salvar.isError ? (salvar.error?.message ?? m.erroSalvar) : null)}
        onTentarDeNovo={avancar}
        onVoltar={anterior ? () => irPara(anterior) : null}
        onAvancar={avancar}
        onPular={pular}
      >
        {Componente ? (
          <Componente
            valor={valor}
            onChange={(novo) => setRespostas({ ...respostas, [etapa]: novo })}
            preset={preset}
            projeto={projeto}
            respostas={respostas}
            etapas={etapas}
            concluidas={concluidas}
            assumidas={assumidas}
            erros={erroNome ? { nome: erroNome } : {}}
            avisosDoCampo={avisosDoCampo}
            onDecidirAviso={decidirSobre}
            decidindo={decidir.isPending}
            erroAviso={decidir.isError ? (decidir.error?.detalhe?.issues?.[0]?.mensagem ?? decidir.error?.message) : null}
          />
        ) : <EtapaFutura etapa={etapa} />}
      </PassoWizard>
    </div>
  );
}
