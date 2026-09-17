import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Campo from '../../components/shared/Campo/Campo.jsx';
import Botao from '../../components/shared/Botao/Botao.jsx';
import { criarCofre, criarConexao, destrancarCofre, listarConexoes, obterCofre, testarConexao } from '../../services/conexoes.js';
import { mensagens } from '../../mensagens.js';
import estilos from './PaginaApis.module.css';

const m = mensagens.apis;
const vazio = { alias: '', provedor: '', tipo: '', endpoint: '', urlTeste: '', cabecalhoChave: 'Authorization', prefixoChave: 'Bearer ', chave: '' };

export default function PaginaApis() {
  const cliente = useQueryClient();
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [form, setForm] = useState(vazio);
  const cofre = useQuery({ queryKey: ['cofre'], queryFn: obterCofre });
  const conexoes = useQuery({ queryKey: ['conexoes'], queryFn: listarConexoes });
  const atualizar = () => cliente.invalidateQueries({ queryKey: ['cofre'] });
  const criar = useMutation({ mutationFn: () => criarCofre({ senha, confirmacao }), onSuccess: atualizar });
  const destrancar = useMutation({ mutationFn: () => destrancarCofre({ senha }), onSuccess: atualizar });
  const conectar = useMutation({ mutationFn: () => criarConexao({ ...form, endpoint: form.endpoint || undefined, urlTeste: form.urlTeste || undefined }), onSuccess: () => { setForm(vazio); cliente.invalidateQueries({ queryKey: ['conexoes'] }); } });
  const testar = useMutation({ mutationFn: (id) => testarConexao(id), onSuccess: () => cliente.invalidateQueries({ queryKey: ['conexoes'] }) });
  const estado = cofre.data?.estado;
  const erro = criar.error ?? destrancar.error ?? conectar.error;
  const alterar = (campo) => (evento) => setForm((atual) => ({ ...atual, [campo]: evento.target.value }));
  return <section className={estilos.pagina} aria-labelledby="titulo-apis">
    <h1 id="titulo-apis">{m.titulo}</h1><p className={estilos.micro}>{m.micro}</p>
    {cofre.isPending ? <p role="status">{mensagens.estados.carregando}</p> : null}
    {cofre.isError ? <div role="alert" className={estilos.erro}><p>{m.erroCarregar}</p><Botao variante="secundario" onClick={() => cofre.refetch()}>{mensagens.estados.tentarDeNovo}</Botao></div> : null}
    {estado === 'ausente' ? <form className={estilos.form} onSubmit={(e) => { e.preventDefault(); criar.mutate(); }}>
      <h2>{m.criarCofre}</h2><p className={estilos.micro}>{m.criarMicro}</p>
      <Campo id="senha-mestra" type="password" rotulo={m.senha} microtexto={m.senhaMicro} value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" />
      <Campo id="confirmacao-senha" type="password" rotulo={m.confirmacao} microtexto={m.confirmacaoMicro} value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} autoComplete="new-password" />
      <Botao tipo="submit" carregando={criar.isPending}>{m.criarCofre}</Botao>
    </form> : null}
    {estado === 'trancado' ? <form className={estilos.form} onSubmit={(e) => { e.preventDefault(); destrancar.mutate(); }}>
      <h2>{m.destrancar}</h2><Campo id="senha-destrancar" type="password" rotulo={m.senha} microtexto={m.destrancarMicro} value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" />
      <Botao tipo="submit" carregando={destrancar.isPending}>{m.destrancar}</Botao>
    </form> : null}
    {estado === 'destrancado' ? <><form className={estilos.form} onSubmit={(e) => { e.preventDefault(); conectar.mutate(); }}>
      <h2>{m.nova}</h2><p className={estilos.micro}>{m.novaMicro}</p>
      <Campo id="alias" rotulo={m.alias} microtexto={m.aliasMicro} value={form.alias} onChange={alterar('alias')} />
      <Campo id="provedor" rotulo={m.provedor} microtexto={m.provedorMicro} value={form.provedor} onChange={alterar('provedor')} placeholder="Anthropic, Supabase, Stripe…" />
      <Campo id="tipo" rotulo={m.tipo} microtexto={m.tipoMicro} value={form.tipo} onChange={alterar('tipo')} placeholder="IA, banco, pagamento…" />
      <Campo id="endpoint" rotulo={m.endpoint} microtexto={m.endpointMicro} value={form.endpoint} onChange={alterar('endpoint')} type="url" placeholder="https://api.exemplo.com" />
      <Campo id="url-teste" rotulo={m.urlTeste} microtexto={m.urlTesteMicro} value={form.urlTeste} onChange={alterar('urlTeste')} type="url" placeholder="https://api.exemplo.com/v1/me" />
      <Campo id="cabecalho-chave" rotulo={m.cabecalhoChave} microtexto={m.cabecalhoChaveMicro} value={form.cabecalhoChave} onChange={alterar('cabecalhoChave')} placeholder="Authorization" />
      <Campo id="prefixo-chave" rotulo={m.prefixoChave} microtexto={m.prefixoChaveMicro} value={form.prefixoChave} onChange={alterar('prefixoChave')} placeholder="Bearer " />
      <Campo id="chave-api" rotulo={m.chave} microtexto={m.chaveMicro} value={form.chave} onChange={alterar('chave')} type="password" autoComplete="off" />
      <Botao tipo="submit" carregando={conectar.isPending}>{m.conectar}</Botao>
    </form>
    <section className={estilos.lista}><h2>{m.conexoes}</h2>{conexoes.data?.length ? <ul>{conexoes.data.map((conexao) => <li key={conexao.id}><strong>{conexao.alias}</strong> · {conexao.provedor} · {conexao.tipo} · <span>{m.status(conexao.status)}</span>{conexao.urlTeste ? <Botao variante="secundario" onClick={() => testar.mutate(conexao.id)} carregando={testar.isPending}>{m.testar}</Botao> : <span className={estilos.semTeste}>{m.semTeste}</span>}</li>)}</ul> : <p>{m.vazio}</p>}</section></> : null}
    {erro ?? testar.error ? <p role="alert" className={estilos.erro}>{(erro ?? testar.error).message}</p> : null}
  </section>;
}
