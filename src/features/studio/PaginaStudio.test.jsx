import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderizarComProvedores } from '../../testes/renderizar.jsx';
import { mensagens } from '../../mensagens.js';
import { ErroApi } from '../../services/api.js';
import PaginaStudio, { DOCUMENTO_PADRAO } from './PaginaStudio.jsx';

vi.mock('../../services/projetos.js', () => ({ obterProjeto: vi.fn() }));
vi.mock('../../services/design.js', () => ({ obterDesign: vi.fn(), salvarDesign: vi.fn() }));
import { obterProjeto } from '../../services/projetos.js';
import { obterDesign, salvarDesign } from '../../services/design.js';

const m = mensagens.studio;
const t = m.tokens;
const PADRAO = DOCUMENTO_PADRAO.tokens;

const projeto = (status = 'rascunho') => ({
  projeto: { id: 'p1', nome: 'Alfa', slug: 'alfa', status, etapaAtual: 'identidade' },
  blueprint: { versao: 1, ativo: true, payload: {} },
});
const registro = (payload = DOCUMENTO_PADRAO, versao = 1) => ({ versao, criadoEm: '2026-09-03T00:00:00.000Z', payload });
const comAcento = (valor) => ({ ...DOCUMENTO_PADRAO, tokens: { ...PADRAO, cor: { ...PADRAO.cor, acento: valor } } });

const renderizar = () => renderizarComProvedores(
  <Routes><Route path="/projetos/:id/studio" element={<PaginaStudio />} /></Routes>,
  { rota: '/projetos/p1/studio' },
);

const palco = () => screen.getByRole('region', { name: m.preview.regiao });
const rotuloCor = (caminho) => `${t.rotulos[caminho]}, ${t.corTexto}`;
const campoCor = (caminho) => screen.getByLabelText(rotuloCor(caminho));

beforeEach(() => {
  obterProjeto.mockReset().mockResolvedValue(projeto());
  obterDesign.mockReset().mockResolvedValue(null);
  salvarDesign.mockReset();
});

describe('PaginaStudio', () => {
  it('mostra o estado de carregando enquanto projeto e design não chegam', () => {
    renderizar();
    expect(screen.getByRole('status')).toHaveTextContent(mensagens.estados.carregando);
  });

  it('projeto sem design abre no padrão Kora, dizendo que ainda não existe versão', async () => {
    renderizar();
    expect(await screen.findByText(m.semDocumento)).toBeInTheDocument();
    expect(campoCor('cor.acento')).toHaveValue(PADRAO.cor.acento);
    expect(palco().style.getPropertyValue('--projeto-cor-acento')).toBe(PADRAO.cor.acento);
  });

  it('projeto com design abre nos tokens salvos e diz de que versão eles são', async () => {
    obterDesign.mockResolvedValue(registro(comAcento('#ff0055'), 3));
    renderizar();
    expect(await screen.findByText(m.salvo(3))).toBeInTheDocument();
    expect(campoCor('cor.acento')).toHaveValue('#ff0055');
  });

  // O preview ao vivo é o coração do bloco: muda enquanto se digita, sem requisição nenhuma.
  it('trocar um token muda o preview na hora, e nada é enviado para a API', async () => {
    renderizar();
    fireEvent.change(await screen.findByLabelText(rotuloCor('cor.acento')), { target: { value: '#00ff88' } });
    expect(palco().style.getPropertyValue('--projeto-cor-acento')).toBe('#00ff88');
    fireEvent.change(screen.getByLabelText(t.rotulos['fonte.ui']), { target: { value: 'Inter' } });
    expect(palco().style.getPropertyValue('--projeto-fonte-ui')).toBe('Inter');
    expect(salvarDesign).not.toHaveBeenCalled();
  });

  // Um token berrante é o jeito de ver o vazamento: se a UI do Forge mudasse junto, a variável
  // estaria em algum elemento fora do palco.
  it('o token editado fica dentro do preview, e nenhum elemento fora dele o carrega', async () => {
    renderizar();
    fireEvent.change(await screen.findByLabelText(rotuloCor('cor.fundo')), { target: { value: '#ff00ff' } });
    const dentro = palco();
    expect(dentro.style.getPropertyValue('--projeto-cor-fundo')).toBe('#ff00ff');
    for (const elemento of document.querySelectorAll('[style]')) {
      if (elemento === dentro) continue;
      expect(elemento.getAttribute('style'), elemento.className).not.toContain('--projeto-');
    }
  });

  it('a página leva de volta para o projeto, que é de onde se chega nela', async () => {
    renderizar();
    expect(await screen.findByRole('link', { name: m.voltar })).toHaveAttribute('href', '/projetos/p1');
  });

  it('salvar só fica disponível quando há mudança, e envia o documento inteiro', async () => {
    salvarDesign.mockResolvedValue(registro(comAcento('#00ff88'), 1));
    renderizar();
    expect(await screen.findByRole('button', { name: m.salvar })).toBeDisabled();

    fireEvent.change(campoCor('cor.acento'), { target: { value: '#00ff88' } });
    expect(screen.getByText(m.naoSalvo)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: m.salvar }));
    expect(await screen.findByRole('button', { name: m.salvando })).toBeDisabled();

    await waitFor(() => expect(salvarDesign).toHaveBeenCalledTimes(1));
    const [id, documento] = salvarDesign.mock.calls[0];
    expect(id).toBe('p1');
    expect(documento.tokens.cor.acento).toBe('#00ff88');
    expect(documento.catalogo).toEqual(DOCUMENTO_PADRAO.catalogo);
    expect(await screen.findByText(m.salvo(1))).toBeInTheDocument();
  });

  it('descartar devolve o que está salvo, sem passar pela API', async () => {
    obterDesign.mockResolvedValue(registro(DOCUMENTO_PADRAO, 2));
    renderizar();
    fireEvent.change(await screen.findByLabelText(rotuloCor('cor.acento')), { target: { value: '#00ff88' } });
    fireEvent.click(screen.getByRole('button', { name: m.descartar }));
    expect(campoCor('cor.acento')).toHaveValue(PADRAO.cor.acento);
    expect(screen.getByText(m.salvo(2))).toBeInTheDocument();
    expect(salvarDesign).not.toHaveBeenCalled();
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
    fireEvent.click(screen.getByRole('button', { name: t.restaurarGrupoRotulo(t.grupos.cor.titulo) }));
    expect(campoCor('cor.acento')).toHaveValue(PADRAO.cor.acento);
    expect(screen.getByLabelText(t.rotulos['fonte.ui'])).toHaveValue('Inter');
  });

  it('projeto arquivado é só leitura, com o motivo na tela', async () => {
    obterProjeto.mockResolvedValue(projeto('arquivado'));
    renderizar();
    expect(await screen.findByText(m.arquivado.titulo)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: m.salvar })).toBeDisabled();
    expect(screen.getByRole('button', { name: t.padraoKora })).toBeDisabled();
    expect(campoCor('cor.acento')).toHaveAttribute('readonly');
    expect(palco()).toBeInTheDocument();
  });

  it('erro de carregar oferece tentar de novo, sem perder a página', async () => {
    obterDesign.mockRejectedValue(new ErroApi('FORGE_INTERNAL', 'Falhou'));
    renderizar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Falhou');
    obterDesign.mockResolvedValue(null);
    fireEvent.click(screen.getByRole('button', { name: mensagens.estados.tentarDeNovo }));
    expect(await screen.findByText(m.semDocumento)).toBeInTheDocument();
  });

  it('projeto que não existe manda de volta para a lista, em vez de mostrar erro cru', async () => {
    obterProjeto.mockRejectedValue(new ErroApi('FORGE_NOT_FOUND', 'não existe'));
    renderizar();
    expect(await screen.findByText(m.naoEncontrado)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: mensagens.projeto.voltar })).toBeInTheDocument();
  });

  it('erro ao salvar aparece junto do botão, e o rascunho continua na tela', async () => {
    salvarDesign.mockRejectedValue(new ErroApi('FORGE_VALIDATION', 'token inválido'));
    renderizar();
    fireEvent.change(await screen.findByLabelText(rotuloCor('cor.acento')), { target: { value: '#00ff88' } });
    fireEvent.click(screen.getByRole('button', { name: m.salvar }));
    expect(await screen.findByRole('alert')).toHaveTextContent('token inválido');
    expect(campoCor('cor.acento')).toHaveValue('#00ff88');
  });
});
