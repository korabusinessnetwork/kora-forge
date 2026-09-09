import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TOKENS_PADRAO, CATALOGO_TOKENS } from '@shared/schemas/design.js';
import PainelTokens from './PainelTokens.jsx';
import { mensagens } from '../../../mensagens.js';

const m = mensagens.design;

const renderizar = (tokens = TOKENS_PADRAO) => {
  const onMudar = vi.fn();
  const onRestaurarTudo = vi.fn();
  render(<PainelTokens tokens={tokens} onMudar={onMudar} onRestaurarTudo={onRestaurarTudo} />);
  return { onMudar, onRestaurarTudo };
};

describe('PainelTokens', () => {
  it('agrupa os tokens e usa o nome legível, não o da variável CSS', () => {
    renderizar();
    for (const grupo of Object.values(m.grupos)) expect(screen.getByText(grupo)).toBeInTheDocument();
    expect(screen.getByLabelText('Acento')).toBeInTheDocument();
    expect(screen.queryByText('--cor-acento')).not.toBeInTheDocument();
  });

  it('mostra um controle por token do catálogo', () => {
    renderizar();
    for (const token of CATALOGO_TOKENS) expect(screen.getByLabelText(token.rotulo)).toBeInTheDocument();
  });

  it('token de cor ganha seletor de cor além do campo de texto', () => {
    renderizar();
    expect(screen.getByLabelText(m.escolherCor('Acento'))).toHaveAttribute('type', 'color');
    // Medida não tem seletor de cor.
    expect(screen.queryByLabelText(m.escolherCor('Espaço 4'))).not.toBeInTheDocument();
  });

  it('editar avisa quem sabe editar, com a chave e o valor', () => {
    const { onMudar } = renderizar();
    fireEvent.change(screen.getByLabelText('Acento'), { target: { value: '#123456' } });
    expect(onMudar).toHaveBeenCalledWith('COR_ACENTO', '#123456');
  });

  it('tudo no padrão diz isso, e não oferece restaurar', () => {
    renderizar();
    expect(screen.getByText(m.nenhumAlterado)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: m.restaurarTudo })).toBeDisabled();
  });

  it('conta quantos tokens saíram do padrão', () => {
    renderizar({ ...TOKENS_PADRAO, COR_ACENTO: '#ff0000', ESPACO_4: '20px' });
    expect(screen.getByText(m.quantosAlterados(2))).toBeInTheDocument();
  });

  it('restaurar um token devolve o padrão dele', () => {
    const { onMudar } = renderizar({ ...TOKENS_PADRAO, COR_ACENTO: '#ff0000' });
    fireEvent.click(screen.getByRole('button', { name: m.restaurarToken('Acento') }));
    expect(onMudar).toHaveBeenCalledWith('COR_ACENTO', TOKENS_PADRAO.COR_ACENTO);
  });

  it('restaurar de um token no padrão não é oferecido', () => {
    renderizar();
    expect(screen.getByRole('button', { name: m.restaurarToken('Acento') })).toBeDisabled();
  });

  it('voltar tudo ao padrão avisa quem sabe voltar', () => {
    const { onRestaurarTudo } = renderizar({ ...TOKENS_PADRAO, COR_ACENTO: '#ff0000' });
    fireEvent.click(screen.getByRole('button', { name: m.restaurarTudo }));
    expect(onRestaurarTudo).toHaveBeenCalled();
  });

  it('o microtexto diz o formato esperado, e depois o padrão de onde saiu', () => {
    renderizar({ ...TOKENS_PADRAO, ESPACO_4: '20px' });
    expect(screen.getByText(m.microAlterado(TOKENS_PADRAO.ESPACO_4))).toBeInTheDocument();
    expect(screen.getAllByText(/Espera um número com unidade/).length).toBeGreaterThan(0);
  });
});
