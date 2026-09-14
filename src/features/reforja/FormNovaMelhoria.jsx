import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LIMITES_ITEM, PRIORIDADES_ITEM } from '@shared/schemas/reforja.js';
import { criarMelhoria } from '../../services/reforja.js';
import Botao from '../../components/shared/Botao/Botao.jsx';
import Campo from '../../components/shared/Campo/Campo.jsx';
import Selecao from '../../components/shared/Selecao/Selecao.jsx';
import { mensagens } from '../../mensagens.js';
import estilos from './FormNovaMelhoria.module.css';

const m = mensagens.reforja;
const PRIORIDADE_PADRAO = 'media';

// Melhoria escrita à mão. Só o título é obrigatório; prioridade nasce no padrão Kora.
export default function FormNovaMelhoria() {
  const cliente = useQueryClient();
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prioridade, setPrioridade] = useState(PRIORIDADE_PADRAO);
  const [erroTitulo, setErroTitulo] = useState(null);
  const [aviso, setAviso] = useState(null);

  const criar = useMutation({
    mutationFn: (dados) => criarMelhoria(dados),
    onSuccess: (item) => {
      setAviso(m.novo.criada(item.titulo));
      setTitulo('');
      setDescricao('');
      setPrioridade(PRIORIDADE_PADRAO);
      cliente.invalidateQueries({ queryKey: ['reforja', 'itens'] });
    },
  });

  const handleSubmit = (evento) => {
    evento.preventDefault();
    setAviso(null);
    if (!titulo.trim()) {
      setErroTitulo(m.novo.tituloObrigatorio);
      return;
    }
    setErroTitulo(null);
    criar.mutate({ titulo, descricao, prioridade });
  };

  const opcoesPrioridade = PRIORIDADES_ITEM.map((valor) => ({ valor, rotulo: m.prioridades[valor], padraoKora: valor === PRIORIDADE_PADRAO }));

  return (
    <section className={estilos.painel} aria-labelledby="titulo-nova-melhoria">
      <h2 id="titulo-nova-melhoria" className={estilos.titulo}>{m.novo.titulo}</h2>
      <form className={estilos.formulario} onSubmit={handleSubmit} noValidate>
        <Campo
          id="melhoria-titulo"
          rotulo={m.novo.campoTitulo}
          microtexto={m.novo.campoTituloMicro}
          erro={erroTitulo}
          value={titulo}
          maxLength={LIMITES_ITEM.titulo}
          onChange={(evento) => setTitulo(evento.target.value)}
        />
        <Campo id="melhoria-descricao" rotulo={m.novo.campoDescricao} microtexto={m.novo.campoDescricaoMicro}>
          <textarea
            id="melhoria-descricao"
            className={estilos.texto}
            rows={3}
            value={descricao}
            maxLength={LIMITES_ITEM.descricao}
            aria-describedby="melhoria-descricao-microtexto"
            onChange={(evento) => setDescricao(evento.target.value)}
          />
        </Campo>
        <Campo id="melhoria-prioridade" rotulo={m.novo.campoPrioridade} microtexto={m.novo.campoPrioridadeMicro}>
          <Selecao id="melhoria-prioridade" valor={prioridade} onChange={setPrioridade} opcoes={opcoesPrioridade} aria-describedby="melhoria-prioridade-microtexto" />
        </Campo>

        {criar.isError ? <p role="alert" className={estilos.falha}>{criar.error?.message ?? mensagens.estados.erroGenerico}</p> : null}
        {aviso ? <p role="status" className={estilos.sucesso}>{aviso}</p> : null}

        <div className={estilos.acoes}>
          <Botao tipo="submit" carregando={criar.isPending}>{m.novo.criar}</Botao>
        </div>
      </form>
    </section>
  );
}
