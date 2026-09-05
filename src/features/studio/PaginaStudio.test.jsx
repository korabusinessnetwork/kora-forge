import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderizarComProvedores } from '../../testes/renderizar.jsx';
import { mensagens } from '../../mensagens.js';
import { ErroApi } from '../../services/api.js';
import PaginaStudio, { DOCUMENTO_PADRAO } from './PaginaStudio.jsx';

vi.mock('../../services/projetos.js', () => ({ obterProjeto: vi.fn() }));
vi.mock('../../services/design.js', () => ({ obterDesign: vi.fn(), salvarDesign: vi.fn() }));
vi.mock('../../services/catalogo.js', () => ({ obterCatalogo: vi.fn() }));
import { obterProjeto } from '../../services/projetos.js';
import { obterDesign, salvarDesign } from '../../services/design.js';
import { obterCatalogo } from '../../services/catalogo.js';

const m = mensagens.studio;
const t = m.tokens;
const PADRAO = DOCUMENTO_PADRAO.tokens;

// Catálogo de teste, com a forma do real. Escrito aqui para que cada caso diga na cara o que está
// sendo exercitado, sem depender de qual item o catálogo builtin tem hoje.
const CATALOGO = {
  versao: 1,
  itens: [
    { id: 'secao', versao: 1, papel: 'regiao', nome: 'Seção', descricao: 'Um bloco.', microtexto: 'Vira uma <section>.', props: [], aceita: ['titulo', 'texto'] },
    { id: 'rodape', versao: 1, papel: 'regiao', nome: 'Rodapé', descricao: 'O fim.', microtexto: 'Vira um <footer>.', props: [], aceita: ['texto'] },
    {
      id: 'titulo',
      versao: 1,
      papel: 'componente',
      nome: 'Título',
      descricao: 'Um título.',
      microtexto: 'Vira um heading.',
      props: [
        { id: 'texto', tipo: 'texto', rotulo: 'Texto', microtexto: 'O que o título diz.', padrao: 'Título da seção', obrigatoria: true },
        { id: 'nivel', tipo: 'opcao', rotulo: 'Nível', microtexto: 'A tag do heading.', padrao: '2', obrigatoria: false, opcoes: ['1', '2', '3'] },
      ],
      aceita: [],
    },
    {
      id: 'texto',
      versao: 1,
      papel: 'componente',
      nome: 'Texto',
      descricao: 'Um parágrafo.',
      microtexto: 'Vira um <p>.',
      props: [{ id: 'conteudo', tipo: 'texto', rotulo: 'Conteúdo', microtexto: 'O parágrafo.', padrao: 'Escreva aqui.', obrigatoria: false }],
      aceita: [],
    },
  ],
};

const projeto = (status = 'rascunho') => ({
  projeto: { id: 'p1', nome: 'Alfa', slug: 'alfa', status, etapaAtual: 'identidade' },
  blueprint: { versao: 1, ativo: true, payload: {} },
});
const registro = (payload = DOCUMENTO_PADRAO, versao = 1) => ({ versao, criadoEm: '2026-09-03T00:00:00.000Z', payload, pendencias: [] });
const comAcento = (valor) => ({ ...DOCUMENTO_PADRAO, tokens: { ...PADRAO, cor: { ...PADRAO.cor, acento: valor } } });

const no = (id, tipo, filhos = [], props = {}) => ({ id, tipo, props, filhos });
const comPaginas = (paginas) => ({ ...DOCUMENTO_PADRAO, paginas });
const umaPagina = (regioes = []) => comPaginas([{ id: 'inicio', nome: 'Início', rota: '/', regioes }]);

const renderizar = () => renderizarComProvedores(
  <Routes><Route path="/projetos/:id/studio" element={<PaginaStudio />} /></Routes>,
  { rota: '/projetos/p1/studio' },
);

const palco = () => screen.getByRole('region', { name: m.preview.regiao });
const arvore = () => screen.getByRole('tree', { name: m.camadas.arvore });
const linha = (nome) => within(arvore()).getByRole('treeitem', { name: new RegExp(nome) });
const rotuloCor = (caminho) => `${t.rotulos[caminho]}, ${t.corTexto}`;
const campoCor = (caminho) => screen.getByLabelText(rotuloCor(caminho));
const botao = (nome) => screen.getByRole('button', { name: nome });
// O painel de propriedades e o de tokens têm campos de mesmo rótulo ("Texto" é uma cor e é
// também a prop do título). São duas regiões diferentes, então a busca é escopada à região.
const propriedades = () => screen.getByRole('region', { name: m.propriedades.titulo });
const campoDaProp = (rotulo) => within(propriedades()).getByLabelText(rotulo);

beforeEach(() => {
  obterProjeto.mockReset().mockResolvedValue(projeto());
  obterDesign.mockReset().mockResolvedValue(null);
  obterCatalogo.mockReset().mockResolvedValue(CATALOGO);
  salvarDesign.mockReset();
});

describe('estados da página', () => {
  it('mostra o estado de carregando enquanto projeto, design e catálogo não chegam', () => {
    renderizar();
    expect(screen.getByRole('status')).toHaveTextContent(mensagens.estados.carregando);
  });

  it('projeto sem design abre no padrão Kora, dizendo que ainda não existe versão', async () => {
    renderizar();
    expect(await screen.findByText(m.semDocumento)).toBeInTheDocument();
    expect(campoCor('cor.acento')).toHaveValue(PADRAO.cor.acento);
    expect(palco().style.getPropertyValue('--projeto-cor-acento')).toBe(PADRAO.cor.acento);
  });

  it('sem página nenhuma, as camadas mostram o vazio com a próxima ação', async () => {
    renderizar();
    expect(await screen.findByText(m.camadas.vazio.titulo)).toBeInTheDocument();
    expect(botao(m.camadas.vazio.acao)).toBeInTheDocument();
    expect(screen.queryByRole('tree')).not.toBeInTheDocument();
  });

  it('a página leva de volta para o projeto, que é de onde se chega nela', async () => {
    renderizar();
    expect(await screen.findByRole('link', { name: m.voltar })).toHaveAttribute('href', '/projetos/p1');
  });

  it('erro de carregar oferece tentar de novo, sem perder a página', async () => {
    obterDesign.mockRejectedValue(new ErroApi('FORGE_INTERNAL', 'Falhou'));
    renderizar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Falhou');
    obterDesign.mockResolvedValue(null);
    fireEvent.click(botao(mensagens.estados.tentarDeNovo));
    expect(await screen.findByText(m.semDocumento)).toBeInTheDocument();
  });

  it('catálogo que não carrega também é erro tratado, e não Studio pela metade', async () => {
    obterCatalogo.mockRejectedValue(new ErroApi('FORGE_INTERNAL', 'catálogo fora do ar'));
    renderizar();
    expect(await screen.findByRole('alert')).toHaveTextContent('catálogo fora do ar');
  });

  it('projeto que não existe manda de volta para a lista, em vez de mostrar erro cru', async () => {
    obterProjeto.mockRejectedValue(new ErroApi('FORGE_NOT_FOUND', 'não existe'));
    renderizar();
    expect(await screen.findByText(m.naoEncontrado)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: mensagens.projeto.voltar })).toBeInTheDocument();
  });
});

describe('montar a estrutura', () => {
  it('criar a primeira página põe a página na árvore e já a deixa selecionada', async () => {
    renderizar();
    fireEvent.click(await screen.findByRole('button', { name: m.camadas.vazio.acao }));
    expect(linha(m.camadas.nomeDaPrimeira)).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText(m.propriedades.pagina.nome)).toHaveValue(m.camadas.nomeDaPrimeira);
    expect(screen.getByLabelText(m.propriedades.pagina.rota)).toHaveValue('/');
  });

  it('a paleta só oferece o que o catálogo aceita no ponto onde se está', async () => {
    obterDesign.mockResolvedValue(registro(umaPagina()));
    renderizar();
    // Página selecionada: só região entra no topo.
    expect(await screen.findByRole('button', { name: m.paleta.adicionarRotulo('Seção') })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: m.paleta.adicionarRotulo('Título') })).not.toBeInTheDocument();

    fireEvent.click(botao(m.paleta.adicionarRotulo('Seção')));
    // Com a seção selecionada, o que ela aceita aparece; o que ela não aceita, não.
    expect(botao(m.paleta.adicionarRotulo('Título'))).toBeInTheDocument();
  });

  it('inserir um item o seleciona, e o item nasce com as props do catálogo já preenchidas', async () => {
    obterDesign.mockResolvedValue(registro(umaPagina([no('secao', 'secao')])));
    renderizar();
    fireEvent.click(await screen.findByRole('treeitem', { name: /Seção/ }));
    fireEvent.click(botao(m.paleta.adicionarRotulo('Título')));

    expect(linha('Título')).toHaveAttribute('aria-selected', 'true');
    expect(campoDaProp('Texto')).toHaveValue('Título da seção');
    expect(campoDaProp('Nível')).toHaveValue('2');
  });

  it('sem página nenhuma, a paleta diz que o primeiro passo é criar a página', async () => {
    renderizar();
    expect(await screen.findByText(m.paleta.vazioSemPagina)).toBeInTheDocument();
  });

  it('o filtro é o aceita do item selecionado, e não uma lista fixa', async () => {
    // O rodapé aceita texto e não aceita título; a seção aceita os dois.
    obterDesign.mockResolvedValue(registro(umaPagina([no('secao', 'secao'), no('rodape', 'rodape')])));
    renderizar();
    fireEvent.click(await screen.findByRole('treeitem', { name: /Rodapé/ }));
    expect(botao(m.paleta.adicionarRotulo('Texto'))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: m.paleta.adicionarRotulo('Título') })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('treeitem', { name: /Seção/ }));
    expect(botao(m.paleta.adicionarRotulo('Título'))).toBeInTheDocument();
  });

  it('editar uma prop muda o canvas na hora, sem passar pela API', async () => {
    obterDesign.mockResolvedValue(registro(umaPagina([no('secao', 'secao', [no('titulo', 'titulo', [], { texto: 'Antes', nivel: '1' })])])));
    renderizar();
    fireEvent.click(await screen.findByRole('treeitem', { name: /Título/ }));
    fireEvent.change(campoDaProp('Texto'), { target: { value: 'Depois' } });

    expect(screen.getByRole('heading', { level: 1, name: 'Depois' })).toBeInTheDocument();
    expect(linha('Título')).toHaveTextContent('Depois');
    expect(salvarDesign).not.toHaveBeenCalled();
  });

  it('clicar no canvas seleciona o nó, e o painel de propriedades acompanha', async () => {
    obterDesign.mockResolvedValue(registro(umaPagina([no('secao', 'secao', [no('titulo', 'titulo', [], { texto: 'Bem-vindo', nivel: '2' })])])));
    renderizar();
    fireEvent.click(await screen.findByRole('heading', { name: 'Bem-vindo' }));
    expect(campoDaProp('Texto')).toHaveValue('Bem-vindo');
    expect(linha('Título')).toHaveAttribute('aria-selected', 'true');
  });

  it('a árvore desenhada no canvas é a mesma do documento, na mesma ordem', async () => {
    obterDesign.mockResolvedValue(registro(umaPagina([
      no('secao', 'secao', [no('t1', 'titulo', [], { texto: 'Primeiro', nivel: '2' }), no('t2', 'titulo', [], { texto: 'Segundo', nivel: '2' })]),
      no('rodape', 'rodape', [no('fim', 'texto', [], { conteudo: 'Terceiro' })]),
    ])));
    renderizar();
    const palcoDaPagina = await screen.findByRole('region', { name: m.canvas.regiao });
    const textos = [...palcoDaPagina.querySelectorAll('h2, p')].map((elemento) => elemento.textContent);
    expect(textos).toEqual(['Primeiro', 'Segundo', 'Terceiro']);
  });
});

describe('teclado nas camadas', () => {
  const montado = async () => {
    obterDesign.mockResolvedValue(registro(umaPagina([
      no('secao', 'secao', [no('titulo', 'titulo', [], { texto: 'Um', nivel: '2' }), no('texto', 'texto', [], { conteudo: 'Dois' })]),
    ])));
    renderizar();
    return screen.findByRole('tree', { name: m.camadas.arvore });
  };

  it('a tabulação entra na árvore uma vez só, e as setas andam por dentro', async () => {
    await montado();
    const itens = screen.getAllByRole('treeitem');
    expect(itens.filter((item) => item.getAttribute('tabindex') === '0')).toHaveLength(1);

    fireEvent.keyDown(linha('Início'), { key: 'ArrowDown' });
    expect(linha('Seção')).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(linha('Seção'), { key: 'ArrowRight' });
    expect(linha('Título')).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(linha('Título'), { key: 'ArrowDown' });
    expect(linha('Texto')).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(linha('Texto'), { key: 'ArrowLeft' });
    expect(linha('Seção')).toHaveAttribute('aria-selected', 'true');
  });

  it('Alt com as setas reordena entre irmãos', async () => {
    await montado();
    fireEvent.click(linha('Título'));
    fireEvent.keyDown(linha('Título'), { key: 'ArrowDown', altKey: true });
    const nomes = screen.getAllByRole('treeitem').map((item) => item.textContent);
    expect(nomes[2]).toContain('Texto');
    expect(nomes[3]).toContain('Título');
  });

  it('Delete em folha remove na hora, e o desfazer nomeia o que foi removido', async () => {
    await montado();
    fireEvent.click(linha('Título'));
    fireEvent.keyDown(linha('Título'), { key: 'Delete' });
    expect(screen.queryByRole('treeitem', { name: /Título/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: m.historico.desfazerCom(m.acoes.remover('Título')) })).toBeInTheDocument();
  });

  it('remover algo com filhos pergunta antes, dizendo quantos vão junto', async () => {
    await montado();
    fireEvent.click(linha('Seção'));
    fireEvent.keyDown(linha('Seção'), { key: 'Delete' });
    const confirmacao = screen.getByRole('alertdialog');
    expect(confirmacao).toHaveTextContent(m.camadas.confirmarRemocao('Seção', 2));
    expect(linha('Seção')).toBeInTheDocument();

    fireEvent.click(within(confirmacao).getByRole('button', { name: m.camadas.confirmar }));
    expect(screen.queryByRole('treeitem', { name: /Seção/ })).not.toBeInTheDocument();
  });

  it('cancelar a confirmação não remove nada', async () => {
    await montado();
    fireEvent.click(linha('Seção'));
    fireEvent.keyDown(linha('Seção'), { key: 'Delete' });
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: m.camadas.cancelar }));
    expect(linha('Seção')).toBeInTheDocument();
  });

  it('mover para onde não cabe fica desabilitado, em vez de falhar depois do clique', async () => {
    await montado();
    fireEvent.click(linha('Título'));
    expect(botao(`${m.camadas.mover.cima}: Título`)).toBeDisabled();
    expect(botao(`${m.camadas.mover.baixo}: Título`)).toBeEnabled();
    // Componente não sai para o topo da página, porque lá só entra região.
    expect(botao(`${m.camadas.mover.sair}: Título`)).toBeDisabled();
  });
});

describe('desfazer e refazer', () => {
  it('desfaz e refaz a última edição, e o botão diz qual é', async () => {
    obterDesign.mockResolvedValue(registro(umaPagina()));
    renderizar();
    fireEvent.click(await screen.findByRole('button', { name: m.paleta.adicionarRotulo('Seção') }));
    expect(linha('Seção')).toBeInTheDocument();

    fireEvent.click(botao(m.historico.desfazerCom(m.acoes.adicionar('Seção'))));
    expect(screen.queryByRole('treeitem', { name: /Seção/ })).not.toBeInTheDocument();

    fireEvent.click(botao(m.historico.refazerCom(m.acoes.adicionar('Seção'))));
    expect(linha('Seção')).toBeInTheDocument();
  });

  it('sem nada para desfazer, os dois botões ficam desabilitados e dizem por quê', async () => {
    renderizar();
    expect(await screen.findByRole('button', { name: m.historico.nadaParaDesfazer })).toBeDisabled();
    expect(botao(m.historico.nadaParaRefazer)).toBeDisabled();
  });

  it('Ctrl+Z desfaz de qualquer lugar do Studio', async () => {
    obterDesign.mockResolvedValue(registro(umaPagina()));
    renderizar();
    fireEvent.click(await screen.findByRole('button', { name: m.paleta.adicionarRotulo('Seção') }));
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(screen.queryByRole('treeitem', { name: /Seção/ })).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });
    expect(linha('Seção')).toBeInTheDocument();
  });

  it('dentro de um campo de texto, o Ctrl+Z é do navegador e o Studio não interfere', async () => {
    obterDesign.mockResolvedValue(registro(umaPagina([no('secao', 'secao')])));
    renderizar();
    fireEvent.click(await screen.findByRole('treeitem', { name: /Seção/ }));
    fireEvent.click(botao(m.paleta.adicionarRotulo('Título')));
    const campo = campoDaProp('Texto');
    fireEvent.change(campo, { target: { value: 'Editado' } });

    fireEvent.keyDown(campo, { key: 'z', ctrlKey: true });
    // O título continua lá: o atalho não foi capturado pelo Studio.
    expect(linha('Título')).toBeInTheDocument();
    expect(campoDaProp('Texto')).toHaveValue('Editado');
  });

  it('digitar num campo é um desfazer só, e não um por letra', async () => {
    obterDesign.mockResolvedValue(registro(umaPagina([no('secao', 'secao', [no('titulo', 'titulo', [], { texto: 'A', nivel: '2' })])])));
    renderizar();
    fireEvent.click(await screen.findByRole('treeitem', { name: /Título/ }));
    for (const valor of ['Ab', 'Abc', 'Abcd']) {
      fireEvent.change(campoDaProp('Texto'), { target: { value: valor } });
    }
    fireEvent.click(botao(m.historico.desfazerCom(m.acoes.editarProp('Texto'))));
    expect(campoDaProp('Texto')).toHaveValue('A');
    expect(botao(m.historico.nadaParaDesfazer)).toBeDisabled();
  });

  it('os tokens passam pela mesma história do desenho, porque o documento é um só', async () => {
    renderizar();
    fireEvent.change(await screen.findByLabelText(rotuloCor('cor.acento')), { target: { value: '#00ff88' } });
    fireEvent.click(botao(m.historico.desfazerCom(m.acoes.editarToken(t.rotulos['cor.acento']))));
    expect(campoCor('cor.acento')).toHaveValue(PADRAO.cor.acento);
  });
});

describe('tokens e preview continuam funcionando como no bloco 2', () => {
  it('trocar um token muda a amostra na hora, e nada é enviado para a API', async () => {
    renderizar();
    fireEvent.change(await screen.findByLabelText(rotuloCor('cor.acento')), { target: { value: '#00ff88' } });
    expect(palco().style.getPropertyValue('--projeto-cor-acento')).toBe('#00ff88');
    fireEvent.change(screen.getByLabelText(t.rotulos['fonte.ui']), { target: { value: 'Inter' } });
    expect(palco().style.getPropertyValue('--projeto-fonte-ui')).toBe('Inter');
    expect(salvarDesign).not.toHaveBeenCalled();
  });

  // Um token berrante é o jeito de ver o vazamento: se a UI do Forge mudasse junto, a variável
  // estaria em algum elemento fora do palco.
  it('o token editado fica dentro do palco, e nenhum elemento fora dele o carrega', async () => {
    obterDesign.mockResolvedValue(registro(umaPagina([no('secao', 'secao')])));
    renderizar();
    fireEvent.change(await screen.findByLabelText(rotuloCor('cor.fundo')), { target: { value: '#ff00ff' } });
    const dentro = screen.getByRole('region', { name: m.canvas.regiao });
    expect(dentro.style.getPropertyValue('--projeto-cor-fundo')).toBe('#ff00ff');
    for (const elemento of document.querySelectorAll('[style]')) {
      if (elemento === dentro) continue;
      expect(elemento.getAttribute('style'), elemento.className).not.toContain('--projeto-');
    }
  });

  it('sem página, o centro mostra a amostra de tokens; com página, mostra a página', async () => {
    obterDesign.mockResolvedValue(registro(umaPagina()));
    renderizar();
    expect(await screen.findByRole('region', { name: m.canvas.regiao })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(m.canvas.vista), { target: { value: 'amostra' } });
    expect(palco()).toBeInTheDocument();
  });

  it('voltar ao padrão Kora restaura tudo de uma vez, e continua sendo uma mudança por salvar', async () => {
    obterDesign.mockResolvedValue(registro(comAcento('#ff0055'), 2));
    renderizar();
    fireEvent.click(await screen.findByRole('button', { name: t.padraoKora }));
    expect(campoCor('cor.acento')).toHaveValue(PADRAO.cor.acento);
    expect(screen.getByText(m.naoSalvo)).toBeInTheDocument();
  });

  it('restaurar um grupo não mexe nos outros grupos', async () => {
    renderizar();
    fireEvent.change(await screen.findByLabelText(rotuloCor('cor.acento')), { target: { value: '#00ff88' } });
    fireEvent.change(screen.getByLabelText(t.rotulos['fonte.ui']), { target: { value: 'Inter' } });
    fireEvent.click(botao(t.restaurarGrupoRotulo(t.grupos.cor.titulo)));
    expect(campoCor('cor.acento')).toHaveValue(PADRAO.cor.acento);
    expect(screen.getByLabelText(t.rotulos['fonte.ui'])).toHaveValue('Inter');
  });
});

describe('salvar', () => {
  it('salvar só fica disponível quando há mudança, e envia o documento inteiro', async () => {
    // A gravação fica pendurada de propósito: o estado de carregando é um dos quatro obrigatórios,
    // e com uma promessa que resolve na hora ele não chega a existir para ser conferido.
    let concluir;
    salvarDesign.mockReturnValue(new Promise((resolver) => { concluir = () => resolver(registro(comAcento('#00ff88'), 1)); }));
    renderizar();
    expect(await screen.findByRole('button', { name: m.salvar })).toBeDisabled();

    fireEvent.change(campoCor('cor.acento'), { target: { value: '#00ff88' } });
    expect(screen.getByText(m.naoSalvo)).toBeInTheDocument();
    fireEvent.click(botao(m.salvar));
    expect(await screen.findByRole('button', { name: m.salvando })).toBeDisabled();
    concluir();

    await waitFor(() => expect(salvarDesign).toHaveBeenCalledTimes(1));
    const [id, documento] = salvarDesign.mock.calls[0];
    expect(id).toBe('p1');
    expect(documento.tokens.cor.acento).toBe('#00ff88');
    expect(documento.catalogo).toEqual(DOCUMENTO_PADRAO.catalogo);
    expect(await screen.findByText(m.salvo(1))).toBeInTheDocument();
  });

  it('salvar envia as páginas montadas na tela', async () => {
    obterDesign.mockResolvedValue(registro(umaPagina()));
    salvarDesign.mockResolvedValue(registro(umaPagina(), 2));
    renderizar();
    fireEvent.click(await screen.findByRole('button', { name: m.paleta.adicionarRotulo('Seção') }));
    fireEvent.click(botao(m.paleta.adicionarRotulo('Título')));
    fireEvent.click(botao(m.salvar));

    await waitFor(() => expect(salvarDesign).toHaveBeenCalledTimes(1));
    const [, documento] = salvarDesign.mock.calls[0];
    expect(documento.paginas[0].regioes[0].tipo).toBe('secao');
    expect(documento.paginas[0].regioes[0].filhos[0]).toMatchObject({ tipo: 'titulo', props: { texto: 'Título da seção', nivel: '2' } });
  });

  it('descartar devolve o que está salvo, sem passar pela API', async () => {
    obterDesign.mockResolvedValue(registro(DOCUMENTO_PADRAO, 2));
    renderizar();
    fireEvent.change(await screen.findByLabelText(rotuloCor('cor.acento')), { target: { value: '#00ff88' } });
    fireEvent.click(botao(m.descartar));
    expect(campoCor('cor.acento')).toHaveValue(PADRAO.cor.acento);
    expect(screen.getByText(m.salvo(2))).toBeInTheDocument();
    expect(salvarDesign).not.toHaveBeenCalled();
  });

  it('recusa do servidor aparece legível, uma linha por problema', async () => {
    const erro = new ErroApi('FORGE_VALIDATION', 'O desenho usa item que o catálogo não tem.');
    erro.detalhe = { issues: [{ caminho: 'paginas.0.regioes.0.tipo', mensagem: '"carrossel" não existe no catálogo deste Forge.' }] };
    salvarDesign.mockRejectedValue(erro);
    renderizar();
    fireEvent.change(await screen.findByLabelText(rotuloCor('cor.acento')), { target: { value: '#00ff88' } });
    fireEvent.click(botao(m.salvar));
    expect(await screen.findByRole('alert')).toHaveTextContent('"carrossel" não existe no catálogo deste Forge.');
    expect(campoCor('cor.acento')).toHaveValue('#00ff88');
  });

  it('erro sem detalhe ainda mostra a mensagem, e o rascunho continua na tela', async () => {
    salvarDesign.mockRejectedValue(new ErroApi('FORGE_INTERNAL', 'token inválido'));
    renderizar();
    fireEvent.change(await screen.findByLabelText(rotuloCor('cor.acento')), { target: { value: '#00ff88' } });
    fireEvent.click(botao(m.salvar));
    expect(await screen.findByRole('alert')).toHaveTextContent('token inválido');
  });
});

describe('item que saiu do catálogo', () => {
  const comPendencia = () => registro(umaPagina([no('antigo', 'carrossel', [], { velocidade: 3 })]), 4);

  it('o desenho abre inteiro, com o item nomeado e marcado nas camadas', async () => {
    obterDesign.mockResolvedValue(comPendencia());
    renderizar();
    const marcado = await screen.findByRole('treeitem', { name: /carrossel/ });
    expect(marcado).toHaveTextContent(m.camadas.pendente);
    expect(screen.getByText(m.pendencias.aviso(1))).toBeInTheDocument();
  });

  it('o Studio impede a tentativa de salvar, dizendo o motivo antes do clique', async () => {
    obterDesign.mockResolvedValue(comPendencia());
    renderizar();
    fireEvent.change(await screen.findByLabelText(rotuloCor('cor.acento')), { target: { value: '#00ff88' } });
    expect(botao(m.salvar)).toBeDisabled();
    expect(screen.getByText(m.pendencias.naoSalva)).toBeInTheDocument();
    expect(salvarDesign).not.toHaveBeenCalled();
  });

  it('remover o item destrava o salvar na hora, sem precisar recarregar', async () => {
    obterDesign.mockResolvedValue(comPendencia());
    renderizar();
    fireEvent.click(await screen.findByRole('treeitem', { name: /carrossel/ }));
    fireEvent.keyDown(screen.getByRole('treeitem', { name: /carrossel/ }), { key: 'Delete' });
    expect(screen.queryByText(m.pendencias.aviso(1))).not.toBeInTheDocument();
    expect(botao(m.salvar)).toBeEnabled();
  });

  it('o painel de propriedades não inventa formulário: mostra o que está gravado e oferece remover', async () => {
    obterDesign.mockResolvedValue(comPendencia());
    renderizar();
    fireEvent.click(await screen.findByRole('treeitem', { name: /carrossel/ }));
    expect(screen.getByText(m.propriedades.pendente.titulo)).toBeInTheDocument();
    expect(screen.getByText(m.propriedades.pendente.texto('carrossel'))).toBeInTheDocument();
    expect(screen.getByText('velocidade')).toBeInTheDocument();
  });

  it('o canvas desenha a caixa do desconhecido, em vez de inventar aparência', async () => {
    obterDesign.mockResolvedValue(comPendencia());
    renderizar();
    expect(await screen.findByText(m.canvas.desconhecido('carrossel'))).toBeInTheDocument();
  });
});

describe('projeto arquivado', () => {
  it('é só leitura de ponta a ponta, com o motivo na tela', async () => {
    obterProjeto.mockResolvedValue(projeto('arquivado'));
    obterDesign.mockResolvedValue(registro(umaPagina([no('secao', 'secao')])));
    renderizar();
    expect(await screen.findByText(m.arquivado.titulo)).toBeInTheDocument();
    expect(botao(m.salvar)).toBeDisabled();
    expect(botao(t.padraoKora)).toBeDisabled();
    expect(botao(m.camadas.novaPagina)).toBeDisabled();
    expect(campoCor('cor.acento')).toHaveAttribute('readonly');

    fireEvent.click(linha('Seção'));
    expect(botao(m.paleta.adicionarRotulo('Título'))).toBeDisabled();
    expect(botao(m.camadas.removerRotulo('Seção'))).toBeDisabled();
  });

  it('nem pelo teclado dá para remover num projeto arquivado', async () => {
    obterProjeto.mockResolvedValue(projeto('arquivado'));
    obterDesign.mockResolvedValue(registro(umaPagina([no('secao', 'secao')])));
    renderizar();
    fireEvent.click(await screen.findByRole('treeitem', { name: /Seção/ }));
    fireEvent.keyDown(linha('Seção'), { key: 'Delete' });
    expect(linha('Seção')).toBeInTheDocument();
  });
});

describe('propriedades da página', () => {
  it('rota inválida é avisada no campo, na hora, e o salvar não passa por lá', async () => {
    obterDesign.mockResolvedValue(registro(umaPagina()));
    renderizar();
    fireEvent.change(await screen.findByLabelText(m.propriedades.pagina.rota), { target: { value: 'sem-barra' } });
    expect(screen.getByRole('alert')).toHaveTextContent(m.propriedades.pagina.rotaInvalida);
  });

  it('rota repetida diz qual página já usa aquele caminho', async () => {
    obterDesign.mockResolvedValue(registro(comPaginas([
      { id: 'inicio', nome: 'Início', rota: '/', regioes: [] },
      { id: 'painel', nome: 'Painel', rota: '/painel', regioes: [] },
    ])));
    renderizar();
    fireEvent.click(await screen.findByRole('treeitem', { name: /Painel/ }));
    fireEvent.change(screen.getByLabelText(m.propriedades.pagina.rota), { target: { value: '/' } });
    expect(screen.getByRole('alert')).toHaveTextContent(m.propriedades.pagina.rotaRepetida('Início'));
  });

  it('sem seleção, o painel diz o que fazer em vez de ficar vazio', async () => {
    renderizar();
    expect(await screen.findByText(m.propriedades.semSelecao)).toBeInTheDocument();
  });
});
