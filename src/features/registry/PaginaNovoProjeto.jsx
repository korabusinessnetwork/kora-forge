import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { gerarSlug } from '@shared/slug.js';
import { listarPresets } from '../../services/presets.js';
import { criarProjeto } from '../../services/projetos.js';
import Botao from '../../components/shared/Botao/Botao.jsx';
import Campo from '../../components/shared/Campo/Campo.jsx';
import CartaoPreset from '../../components/registry/CartaoPreset/CartaoPreset.jsx';
import { mensagens } from '../../mensagens.js';
import estilos from './PaginaRegistry.module.css';

const m = mensagens.novoProjeto;

function mensagemDoCampo(erro, campo) {
  const issue = (erro?.detalhe?.issues ?? []).find((item) => item.caminho === campo);
  return issue?.mensagem ?? null;
}

export default function PaginaNovoProjeto() {
  const [params] = useSearchParams();
  const navegar = useNavigate();
  const clienteQuery = useQueryClient();
  const presets = useQuery({ queryKey: ['presets'], queryFn: listarPresets });
  const [presetId, setPresetId] = useState(params.get('preset'));
  const [nome, setNome] = useState('');

  const criar = useMutation({
    mutationFn: criarProjeto,
    onSuccess: ({ projeto }) => {
      clienteQuery.invalidateQueries({ queryKey: ['projetos'] });
      navegar(`/projetos/${projeto.id}`);
    },
  });

  const presetEscolhido = presets.data?.find((preset) => preset.id === presetId) ?? null;
  const slug = gerarSlug(nome);
  const erroNome = criar.isError ? (mensagemDoCampo(criar.error, 'nome') ?? mensagemDoCampo(criar.error, 'presetId')) : null;
  const erroGeral = criar.isError && !erroNome ? (criar.error?.message ?? mensagens.estados.erroGenerico) : null;

  const enviar = (evento) => {
    evento.preventDefault();
    if (!presetEscolhido) return;
    criar.mutate({ nome: nome.trim(), presetId: presetEscolhido.id });
  };

  return (
    <section className={estilos.pagina} aria-labelledby="titulo-novo">
      <div className={estilos.cabecalho}>
        <h1 id="titulo-novo">{m.titulo}</h1>
        <Link to="/" className={estilos.voltar}>{m.voltar}</Link>
      </div>

      {presets.isPending ? <p role="status" className={estilos.texto}>{mensagens.estados.carregando}</p> : null}
      {presets.isError ? (
        <div role="alert" className={estilos.erro}>
          <p>{presets.error?.message ?? mensagens.estados.erroGenerico}</p>
          <Botao variante="secundario" onClick={() => presets.refetch()}>{mensagens.estados.tentarDeNovo}</Botao>
        </div>
      ) : null}

      {presets.data && !presetEscolhido ? (
        <>
          <h2>{m.escolha}</h2>
          <div className={estilos.menus}>
            {presets.data.map((preset) => (
              <CartaoPreset key={preset.id} preset={preset} onEscolher={(escolhido) => setPresetId(escolhido.id)} />
            ))}
          </div>
        </>
      ) : null}

      {presetEscolhido ? (
        <form className={estilos.formulario} onSubmit={enviar} noValidate>
          <p className={estilos.escolhido}>
            <span>{m.escolhido}: <strong>{presetEscolhido.nome}</strong></span>
            <Botao variante="fantasma" onClick={() => setPresetId(null)}>{m.trocar}</Botao>
          </p>
          <Campo
            id="nome"
            rotulo={m.nome.rotulo}
            microtexto={`${m.nome.micro} ${m.nome.slug}: ${slug || m.nome.slugVazio}.`}
            erro={erroNome}
            placeholder={m.nome.placeholder}
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
            autoComplete="off"
            maxLength={80}
          />
          <div className={estilos.acoes}>
            <Botao tipo="submit" carregando={criar.isPending} desabilitado={!slug}>{m.criar}</Botao>
            {erroGeral ? <p role="alert" className={estilos.erro}>{erroGeral}</p> : null}
          </div>
        </form>
      ) : null}
    </section>
  );
}
