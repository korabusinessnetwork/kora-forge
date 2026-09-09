import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TOKENS_PADRAO } from '@shared/schemas/design.js';
import { obterDesign, salvarDesign } from '../../../services/design.js';
import PainelTokens from '../../../components/design/PainelTokens/PainelTokens.jsx';
import PreviewTokens from '../../../components/design/PreviewTokens/PreviewTokens.jsx';
import Botao from '../../../components/shared/Botao/Botao.jsx';
import { mensagens } from '../../../mensagens.js';
import estilos from './Design.module.css';

const m = mensagens.design;

// Etapa 4 do wizard, o primeiro pedaço do Studio (ADR-005). Edita os tokens do projeto com preview
// ao vivo. Página, região e componente chegam no bloco de layout, que exige ADR próprio.
export default function Design({ projeto }) {
  const clienteQuery = useQueryClient();
  const [tokens, setTokens] = useState(null);
  const [salvo, setSalvo] = useState(false);

  const documento = useQuery({ queryKey: ['design', projeto.id], queryFn: () => obterDesign(projeto.id) });

  // O que veio do servidor vira o estado de edição uma vez. Depois disso quem manda é a tela, para
  // digitar não ser desfeito por um refetch.
  useEffect(() => {
    if (documento.data && tokens === null) setTokens(documento.data.tokens);
  }, [documento.data, tokens]);

  const gravar = useMutation({
    mutationFn: (valores) => salvarDesign(projeto.id, valores),
    onSuccess: (documentoNovo) => {
      setTokens(documentoNovo.tokens);
      setSalvo(true);
      clienteQuery.setQueryData(['design', projeto.id], documentoNovo);
      // O plano depende dos tokens, então o que estava em cache envelheceu.
      clienteQuery.invalidateQueries({ queryKey: ['plano', projeto.id] });
    },
  });

  if (documento.isPending) return <p role="status" className={estilos.aviso}>{mensagens.estados.carregando}</p>;

  if (documento.isError) {
    return (
      <div role="alert" className={estilos.erro}>
        <p>{documento.error?.message ?? mensagens.estados.erroGenerico}</p>
        <Botao variante="secundario" onClick={() => documento.refetch()}>{mensagens.estados.tentarDeNovo}</Botao>
      </div>
    );
  }

  const atuais = tokens ?? documento.data.tokens;
  const mudar = (chave, valor) => {
    setSalvo(false);
    setTokens({ ...atuais, [chave]: valor });
  };
  const naoSalvo = Object.keys(TOKENS_PADRAO).some((chave) => atuais[chave] !== documento.data.tokens[chave]);

  return (
    <div className={estilos.etapa}>
      <p className={estilos.micro}>{m.micro}</p>

      <div className={estilos.colunas}>
        <PainelTokens
          tokens={atuais}
          onMudar={mudar}
          onRestaurarTudo={() => { setSalvo(false); setTokens({ ...TOKENS_PADRAO }); }}
        />
        <PreviewTokens tokens={atuais} />
      </div>

      <div className={estilos.acoes}>
        <Botao variante="primario" carregando={gravar.isPending} desabilitado={!naoSalvo} onClick={() => gravar.mutate(atuais)}>
          {m.salvar}
        </Botao>
        {salvo && !naoSalvo ? <span role="status" className={estilos.confirmado}>{m.salvo}</span> : null}
        {naoSalvo ? <span className={estilos.micro}>{m.semSalvar}</span> : null}
      </div>

      {gravar.isError ? (
        <p role="alert" className={estilos.erro}>
          {gravar.error?.detalhe?.issues?.[0]?.mensagem ?? gravar.error?.message ?? mensagens.estados.erroGenerico}
        </p>
      ) : null}
    </div>
  );
}
