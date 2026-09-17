import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listarIdeias, registrarIdeia, descartarIdeia } from '../../../services/ideias.js';
import Botao from '../../shared/Botao/Botao.jsx';
import Campo from '../../shared/Campo/Campo.jsx';
import CartaoIdeia from '../CartaoIdeia/CartaoIdeia.jsx';
import { mensagens } from '../../../mensagens.js';
import estilos from './GavetaIdeias.module.css';

const m = mensagens.ideias;

// Organism. Captura de ideia sem sair do fluxo (RN-10, fluxo F-07). Não muda de rota, não abre
// projeto e não pergunta nada além do título. Fechar devolve o foco a quem abriu, que é o que
// "volta para onde estava" quer dizer na prática.
export default function GavetaIdeias({ aberta, onFechar, origem }) {
  const clienteQuery = useQueryClient();
  const [titulo, setTitulo] = useState('');
  const [proximoPasso, setProximoPasso] = useState('');
  const [confirmado, setConfirmado] = useState(false);

  const campoTitulo = useRef(null);
  const focoAnterior = useRef(null);

  const ideias = useQuery({ queryKey: ['ideias'], queryFn: listarIdeias, enabled: aberta });

  const registrar = useMutation({
    mutationFn: () => registrarIdeia({ titulo, proximoPasso, origem }),
    onSuccess: () => {
      // Limpa para a próxima ideia, mantém a gaveta aberta e confirma. Perder o texto digitado só
      // acontece depois de gravar, nunca em erro.
      setTitulo('');
      setProximoPasso('');
      setConfirmado(true);
      clienteQuery.invalidateQueries({ queryKey: ['ideias'] });
      campoTitulo.current?.focus();
    },
  });

  const descartar = useMutation({
    // Encapsulado de propósito: passar a função direto entrega o contexto do React Query como
    // segundo argumento do serviço, e serviço não deve receber o que não pediu.
    mutationFn: (id) => descartarIdeia(id),
    onSuccess: () => clienteQuery.invalidateQueries({ queryKey: ['ideias'] }),
  });

  // Guarda quem tinha o foco antes de abrir e devolve ao fechar.
  useEffect(() => {
    if (!aberta) return undefined;
    focoAnterior.current = globalThis.document?.activeElement ?? null;
    campoTitulo.current?.focus();
    return () => focoAnterior.current?.focus?.();
  }, [aberta]);

  useEffect(() => {
    if (!aberta) return undefined;
    const aoTeclar = (evento) => {
      if (evento.key === 'Escape') onFechar();
    };
    globalThis.addEventListener?.('keydown', aoTeclar);
    return () => globalThis.removeEventListener?.('keydown', aoTeclar);
  }, [aberta, onFechar]);

  if (!aberta) return null;

  const semTitulo = titulo.trim() === '';
  const enviar = (evento) => {
    evento.preventDefault();
    if (semTitulo || registrar.isPending) return;
    setConfirmado(false);
    registrar.mutate();
  };

  return (
    <div className={estilos.fundo} onMouseDown={onFechar}>
      <section
        className={estilos.gaveta}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-gaveta-ideias"
        onMouseDown={(evento) => evento.stopPropagation()}
      >
        <header className={estilos.cabecalho}>
          <h2 id="titulo-gaveta-ideias" className={estilos.titulo}>{m.titulo}</h2>
          <Botao variante="fantasma" onClick={onFechar}>{m.fechar}</Botao>
        </header>
        <p className={estilos.micro}>{m.micro}</p>

        <form className={estilos.formulario} onSubmit={enviar}>
          {/* Forma com children porque o foco precisa de ref, e o atom Campo não encaminha ref. */}
          <Campo id="ideia-titulo" rotulo={m.campoTitulo.rotulo} microtexto={m.campoTitulo.micro}>
            <input
              id="ideia-titulo"
              className={estilos.entrada}
              ref={campoTitulo}
              value={titulo}
              onChange={(evento) => setTitulo(evento.target.value)}
              autoComplete="off"
              aria-describedby="ideia-titulo-microtexto"
            />
          </Campo>
          <Campo id="ideia-proximo-passo" rotulo={m.campoProximoPasso.rotulo} microtexto={m.campoProximoPasso.micro}>
            <textarea
              id="ideia-proximo-passo"
              className={estilos.area}
              rows={2}
              value={proximoPasso}
              onChange={(evento) => setProximoPasso(evento.target.value)}
            />
          </Campo>

          <div className={estilos.acoes}>
            <Botao tipo="submit" variante="primario" carregando={registrar.isPending} desabilitado={semTitulo}>{m.guardar}</Botao>
            {confirmado ? <span role="status" className={estilos.confirmado}>{m.guardada}</span> : null}
          </div>

          {registrar.isError ? (
            <p role="alert" className={estilos.erro}>{registrar.error?.message ?? mensagens.estados.erroGenerico}</p>
          ) : null}
        </form>

        <h3 className={estilos.subtitulo}>{m.listaTitulo}</h3>
        {ideias.isPending ? <p className={estilos.micro}>{mensagens.estados.carregando}</p> : null}
        {ideias.isError ? (
          <p role="alert" className={estilos.erro}>{ideias.error?.message ?? mensagens.estados.erroGenerico}</p>
        ) : null}
        {ideias.data?.length === 0 ? <p className={estilos.micro}>{m.vazio}</p> : null}
        {ideias.data?.length > 0 ? (
          <ul className={estilos.lista}>
            {ideias.data.map((ideia) => (
              <CartaoIdeia
                key={ideia.id}
                ideia={ideia}
                onDescartar={(id) => descartar.mutate(id)}
                descartando={descartar.isPending && descartar.variables === ideia.id}
              />
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
