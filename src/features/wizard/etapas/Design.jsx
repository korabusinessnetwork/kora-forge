import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { obterDesign } from '../../../services/design.js';
import Campo from '../../../components/shared/Campo/Campo.jsx';
import Selecao from '../../../components/shared/Selecao/Selecao.jsx';
import Botao from '../../../components/shared/Botao/Botao.jsx';
import { mensagens } from '../../../mensagens.js';
import estilos from './Design.module.css';

const m = mensagens.wizard.passos.design;

// Uma pergunta só: de onde vem o design. A escolha não é resposta gravada, é o estado da etapa
// (assumida é o padrão Kora, concluída é o desenho do Studio), e quem a guarda é o ConteudoWizard.
// O resumo do desenho salvo é só informação: erro ao consultá-lo não impede avançar nem pular.
export default function Design({ projeto, escolha, onEscolher }) {
  const design = useQuery({ queryKey: ['design', projeto.id], queryFn: () => obterDesign(projeto.id) });
  const salvo = design.data ?? null;

  return (
    <>
      <Campo id="origemDesign" rotulo={m.origem.rotulo} microtexto={m.origem.micro}>
        <Selecao
          id="origemDesign"
          valor={escolha}
          onChange={onEscolher}
          opcoes={[
            { valor: 'padrao', rotulo: m.opcoes.padrao, padraoKora: true },
            { valor: 'studio', rotulo: m.opcoes.studio },
          ]}
        />
      </Campo>

      <div className={estilos.resumo}>
        {design.isPending ? <p role="status" className={estilos.texto}>{m.carregando}</p> : null}
        {design.isError ? (
          <div role="alert" className={estilos.erro}>
            <p>{m.erro}</p>
            <Botao variante="secundario" onClick={() => design.refetch()}>{mensagens.estados.tentarDeNovo}</Botao>
          </div>
        ) : null}
        {design.isSuccess ? (
          <p className={estilos.texto}>{salvo ? m.comDesenho(salvo.payload.paginas.length, salvo.versao) : m.semDesenho}</p>
        ) : null}
        {design.isSuccess && escolha === 'studio' && !salvo ? <p role="status" className={estilos.aviso}>{m.avisoSemDesenho}</p> : null}
        {design.isSuccess && escolha === 'padrao' && salvo ? <p role="status" className={estilos.aviso}>{m.avisoGuardado}</p> : null}
        <p className={estilos.texto}><Link to={`/projetos/${projeto.id}/studio?origem=wizard`}>{m.abrirStudio}</Link></p>
      </div>
    </>
  );
}
