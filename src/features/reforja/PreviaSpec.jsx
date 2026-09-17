import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { gravarSpec, preverSpec } from '../../services/reforja.js';
import Botao from '../../components/shared/Botao/Botao.jsx';
import { mensagens } from '../../mensagens.js';
import estilos from './PreviaSpec.module.css';

const m = mensagens.reforja;

// Dry-run antes da escrita. A prévia não grava nada; gravar só depois do clique em confirmar, e
// sobre arquivo existente só com a caixa de substituição marcada.
export default function PreviaSpec({ item, onFechar, onGravada }) {
  const cliente = useQueryClient();
  const [sobrescrever, setSobrescrever] = useState(false);
  const previa = useQuery({ queryKey: ['reforja', 'previa', item.id], queryFn: () => preverSpec(item.id), gcTime: 0 });

  const gravar = useMutation({
    mutationFn: (opcoes) => gravarSpec(item.id, opcoes),
    onSuccess: (resultado) => {
      cliente.invalidateQueries({ queryKey: ['reforja', 'itens'] });
      onGravada(m.spec.gravada(resultado.caminho));
    },
  });

  const dados = previa.data;
  const bloqueado = !dados || (dados.existe && !sobrescrever);

  return (
    <section className={estilos.previa} aria-labelledby="titulo-previa-spec">
      <header className={estilos.cabecalho}>
        <h3 id="titulo-previa-spec" className={estilos.titulo}>{m.spec.tituloDe(item.titulo)}</h3>
        <p className={estilos.descricao}>{m.spec.descricao}</p>
      </header>

      {previa.isPending ? <p role="status" className={estilos.descricao}>{m.spec.carregando}</p> : null}

      {previa.isError ? (
        <div role="alert" className={estilos.erro}>
          <p>{previa.error?.message ?? mensagens.estados.erroGenerico}</p>
          <Botao variante="secundario" onClick={() => previa.refetch()}>{mensagens.estados.tentarDeNovo}</Botao>
        </div>
      ) : null}

      {dados ? (
        <>
          <p className={estilos.destino}>
            {m.spec.caminho} <code className={estilos.caminho}>{dados.caminho}</code>
            <span className={estilos.versao}>{m.spec.versao(dados.versaoTemplate)}</span>
          </p>
          <pre className={estilos.conteudo} tabIndex={0} aria-label={m.spec.titulo}>{dados.conteudo}</pre>
          {dados.existe ? (
            <div className={estilos.aviso} role="alert">
              <p>{m.spec.existe}</p>
              <label className={estilos.marcar}>
                <input type="checkbox" checked={sobrescrever} onChange={(evento) => setSobrescrever(evento.target.checked)} />
                <span>{m.spec.sobrescrever}</span>
              </label>
            </div>
          ) : null}
        </>
      ) : null}

      {gravar.isError ? <p role="alert" className={estilos.falha}>{gravar.error?.message ?? mensagens.estados.erroGenerico}</p> : null}

      <div className={estilos.acoes}>
        <Botao
          variante="primario"
          desabilitado={bloqueado}
          carregando={gravar.isPending}
          onClick={() => gravar.mutate(dados?.existe ? { sobrescrever: true } : {})}
        >
          {m.spec.confirmar}
        </Botao>
        <Botao variante="fantasma" desabilitado={gravar.isPending} onClick={onFechar}>{m.spec.cancelar}</Botao>
      </div>
    </section>
  );
}
