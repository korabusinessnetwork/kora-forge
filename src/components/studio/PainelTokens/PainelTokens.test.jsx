import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { TOKENS_PADRAO } from '@shared/schemas/design.js';
import { listarCampos, trocarToken } from '../../../features/studio/campos.js';
import PainelTokens from './PainelTokens.jsx';
import { mensagens } from '../../../mensagens.js';

const m = mensagens.studio.tokens;

function renderizar(props = {}) {
  const onTrocar = vi.fn();
  const onRestaurarGrupo = vi.fn();
  const onRestaurarTudo = vi.fn();
  const utils = render(
    <PainelTokens
      tokens={TOKENS_PADRAO}
      onTrocar={onTrocar}
      onRestaurarGrupo={onRestaurarGrupo}
      onRestaurarTudo={onRestaurarTudo}
      {...props}
    />,
  );
  return { ...utils, onTrocar, onRestaurarGrupo, onRestaurarTudo };
}

describe('PainelTokens', () => {
  it('todo token do schema tem controle na tela, nenhum fica sem editor', () => {
    renderizar();
    for (const campo of listarCampos()) {
      const controles = screen.getAllByLabelText(new RegExp(escapar(campo.rotulo)));
      expect(controles.length, campo.caminho).toBeGreaterThan(0);
    }
  });

  it('cada grupo é uma seção de verdade, com título e microtexto', () => {
    renderizar();
    for (const grupo of Object.values(m.grupos)) {
      const secao = screen.getByRole('region', { name: grupo.titulo });
      expect(within(secao).getByText(grupo.micro)).toBeInTheDocument();
    }
  });

  it('todo campo diz o que afeta no resultado e mostra o valor padrão', () => {
    renderizar();
    expect(screen.getByText(new RegExp(escapar(m.micro('--cor-fundo'))))).toBeInTheDocument();
    const micro = screen.getByText(new RegExp(`${escapar(m.micro('--cor-acento'))}.*${escapar(TOKENS_PADRAO.cor.acento)}`));
    expect(micro).toBeInTheDocument();
  });

  // Dois campos podem gerar a mesma variável e ganhar o mesmo rótulo humano: `cor.fundo` e
  // `corEscuro.fundo` são os dois "Fundo" e viram os dois `--cor-fundo`. Na tela isso é um campo
  // que ninguém sabe qual é, e no leitor de tela são dois controles com o mesmo nome. A guarda
  // vale para a página inteira, não só para cor, porque a colisão volta a cada token novo.
  it('nenhum controle repete o nome acessível, mesmo quando dois tokens geram a mesma variável', () => {
    renderizar();
    const nomes = [...document.querySelectorAll('input')].map(nomeAcessivel);
    expect(nomes).not.toContain('');
    expect(new Set(nomes).size, JSON.stringify(repetidos(nomes))).toBe(nomes.length);
  });

  it('o campo do tema escuro diz que cai no bloco escuro, e não repete o microtexto do claro', () => {
    renderizar();
    expect(screen.getByText(new RegExp(escapar(m.micro('--cor-fundo'))))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(escapar(m.microEscuro('--cor-fundo'))))).toBeInTheDocument();
  });

  it('"usar o padrão Kora" é a primeira ação do painel, antes de qualquer campo', () => {
    renderizar();
    const botoes = screen.getAllByRole('button');
    expect(botoes[0]).toHaveTextContent(m.padraoKora);
    expect(screen.getByText(m.padraoKoraMicro)).toBeInTheDocument();
  });

  it('restaurar o painel inteiro e restaurar um grupo são ações separadas', () => {
    const { onRestaurarTudo, onRestaurarGrupo } = renderizar();
    fireEvent.click(screen.getByRole('button', { name: m.padraoKora }));
    expect(onRestaurarTudo).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: m.restaurarGrupoRotulo(m.grupos.cor.titulo) }));
    expect(onRestaurarGrupo).toHaveBeenCalledWith('cor');
  });

  it('cor tem seletor e campo de texto ligados ao mesmo token', () => {
    const { onTrocar } = renderizar();
    const seletor = screen.getByLabelText(`${m.rotulos['cor.acento']}, ${m.corSeletor}`);
    const texto = screen.getByLabelText(`${m.rotulos['cor.acento']}, ${m.corTexto}`);
    expect(seletor).toHaveAttribute('type', 'color');
    expect(seletor).toHaveValue(TOKENS_PADRAO.cor.acento);
    expect(texto).toHaveValue(TOKENS_PADRAO.cor.acento);

    fireEvent.change(texto, { target: { value: '#ff0055' } });
    expect(onTrocar).toHaveBeenCalledWith('cor.acento', '#ff0055');
    fireEvent.change(seletor, { target: { value: '#00ff88' } });
    expect(onTrocar).toHaveBeenCalledWith('cor.acento', '#00ff88');
  });

  it('cor fora do formato do seletor é mantida, com a nota explicando o que o seletor mostra', () => {
    renderizar({ tokens: trocarToken(TOKENS_PADRAO, 'cor.acento', 'oklch(0.7 0.1 200)') });
    expect(screen.getByLabelText(`${m.rotulos['cor.acento']}, ${m.corTexto}`)).toHaveValue('oklch(0.7 0.1 200)');
    expect(screen.getByLabelText(`${m.rotulos['cor.acento']}, ${m.corSeletor}`)).toHaveValue('#000000');
    expect(screen.getAllByText(m.foraDoSeletor).length).toBe(1);
  });

  it('escala usa o nome do token gerado como rótulo, e é editável degrau a degrau', () => {
    const { onTrocar } = renderizar();
    const campo = screen.getByLabelText('--espaco-3');
    expect(campo).toHaveValue('12px');
    fireEvent.change(campo, { target: { value: '14px' } });
    expect(onTrocar).toHaveBeenCalledWith('espaco[2]', '14px');
  });

  it('token em branco mostra o erro junto do campo, antes de tentar salvar', () => {
    renderizar({ tokens: trocarToken(TOKENS_PADRAO, 'fonte.ui', '  ') });
    const alerta = screen.getByRole('alert');
    expect(alerta).toHaveTextContent(m.vazio);
    expect(screen.getByLabelText(m.rotulos['fonte.ui'])).toHaveAttribute('aria-invalid', 'true');
  });

  it('somente leitura desliga toda edição, sem sumir com os valores', () => {
    renderizar({ somenteLeitura: true });
    expect(screen.getByRole('button', { name: m.padraoKora })).toBeDisabled();
    expect(screen.getByLabelText(`${m.rotulos['cor.fundo']}, ${m.corSeletor}`)).toBeDisabled();
    expect(screen.getByLabelText(`${m.rotulos['cor.fundo']}, ${m.corTexto}`)).toHaveAttribute('readonly');
    expect(screen.getByLabelText('--espaco-1')).toHaveValue('4px');
  });
});

const escapar = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const nomeAcessivel = (elemento) => elemento.getAttribute('aria-label')
  ?? document.querySelector(`label[for="${elemento.id}"]`)?.textContent
  ?? '';

const repetidos = (lista) => lista.filter((nome, i) => lista.indexOf(nome) !== i);
