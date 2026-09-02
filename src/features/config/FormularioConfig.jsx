import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TEMAS } from '@shared/schemas/settings.js';
import { atualizarSettings } from '../../services/settings.js';
import Botao from '../../components/shared/Botao/Botao.jsx';
import Campo from '../../components/shared/Campo/Campo.jsx';
import Selecao from '../../components/shared/Selecao/Selecao.jsx';
import { mensagens } from '../../mensagens.js';
import estilos from './PaginaConfig.module.css';

const m = mensagens.config;

function paraFormulario(settings) {
  return { workspace: settings.workspace ?? '', tema: settings.tema, copilotoTetoUsd: String(settings.copilotoTetoUsd) };
}

// Erro de validação do servidor chega como detalhe.issues[{ caminho, mensagem }] e vai para o campo.
function errosPorCampo(erro) {
  const porCampo = {};
  for (const issue of erro?.detalhe?.issues ?? []) {
    if (issue?.caminho) porCampo[issue.caminho] = issue.mensagem;
  }
  return porCampo;
}

export default function FormularioConfig({ inicial }) {
  const clienteQuery = useQueryClient();
  const [form, setForm] = useState(() => paraFormulario(inicial));
  const [erros, setErros] = useState({});
  const [salvo, setSalvo] = useState(false);

  const mutacao = useMutation({
    mutationFn: atualizarSettings,
    onSuccess: (dados) => {
      clienteQuery.setQueryData(['settings'], dados);
      clienteQuery.invalidateQueries({ queryKey: ['health'] });
      setForm(paraFormulario(dados));
      setErros({});
      setSalvo(true);
    },
    onError: (erro) => {
      setSalvo(false);
      setErros(errosPorCampo(erro));
    },
  });

  const alterar = (campo) => (valor) => {
    setSalvo(false);
    setForm((atual) => ({ ...atual, [campo]: valor }));
  };

  const enviar = (evento) => {
    evento.preventDefault();
    setSalvo(false);
    const teto = Number(form.copilotoTetoUsd);
    if (form.copilotoTetoUsd.trim() === '' || !Number.isFinite(teto) || teto < 0) {
      setErros({ copilotoTetoUsd: m.teto.invalido });
      return;
    }
    setErros({});
    const workspace = form.workspace.trim();
    mutacao.mutate({ workspace: workspace === '' ? null : workspace, tema: form.tema, copilotoTetoUsd: teto });
  };

  const erroGeral = mutacao.isError && Object.keys(erros).length === 0
    ? (mutacao.error?.message ?? mensagens.estados.erroGenerico)
    : null;

  return (
    <form className={estilos.formulario} onSubmit={enviar} noValidate>
      <Campo
        id="workspace"
        rotulo={m.workspace.rotulo}
        microtexto={m.workspace.micro}
        erro={erros.workspace}
        mono
        placeholder={m.workspace.placeholder}
        value={form.workspace}
        onChange={(evento) => alterar('workspace')(evento.target.value)}
        autoComplete="off"
        spellCheck={false}
      />

      <Campo id="tema" rotulo={m.tema.rotulo} microtexto={m.tema.micro} erro={erros.tema}>
        <Selecao
          id="tema"
          valor={form.tema}
          onChange={alterar('tema')}
          opcoes={TEMAS.map((tema) => ({ valor: tema, rotulo: m.tema[tema], padraoKora: tema === 'escuro' }))}
        />
      </Campo>

      <Campo
        id="copilotoTetoUsd"
        rotulo={m.teto.rotulo}
        microtexto={m.teto.micro}
        erro={erros.copilotoTetoUsd}
        padrao="5"
        type="number"
        min="0"
        step="0.5"
        inputMode="decimal"
        value={form.copilotoTetoUsd}
        onChange={(evento) => alterar('copilotoTetoUsd')(evento.target.value)}
      />

      <div className={estilos.acoes}>
        <Botao tipo="submit" carregando={mutacao.isPending}>{m.salvar}</Botao>
        {salvo ? <p role="status" className={estilos.sucesso}>{m.salvo}</p> : null}
        {erroGeral ? <p role="alert" className={estilos.erro}>{erroGeral}</p> : null}
      </div>
    </form>
  );
}
