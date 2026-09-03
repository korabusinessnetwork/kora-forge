import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TrilhaEtapas, { estadoDaEtapa } from './TrilhaEtapas.jsx';
import { mensagens } from '../../../mensagens.js';

const etapas = ['identidade', 'escopo', 'design', 'materializar'];

describe('estadoDaEtapa', () => {
  it('classifica atual, concluída, assumida, visitada e pendente', () => {
    const contexto = { atual: 'design', concluidas: ['identidade'], assumidas: ['escopo'], visitaveis: ['identidade', 'escopo'] };
    expect(estadoDaEtapa('design', contexto)).toBe('atual');
    expect(estadoDaEtapa('identidade', contexto)).toBe('concluida');
    expect(estadoDaEtapa('escopo', contexto)).toBe('assumida');
    expect(estadoDaEtapa('materializar', contexto)).toBe('pendente');
    expect(estadoDaEtapa('outra', { ...contexto, visitaveis: ['outra'] })).toBe('visitada');
  });
});

describe('TrilhaEtapas', () => {
  it('marca a atual com aria-current e mostra nome e estado de cada etapa', () => {
    render(<TrilhaEtapas etapas={etapas} atual="design" concluidas={['identidade']} assumidas={['escopo']} onIr={() => {}} />);
    const itens = screen.getAllByRole('button');
    expect(itens).toHaveLength(4);
    expect(itens[2]).toHaveAttribute('aria-current', 'step');
    expect(itens[0]).toHaveTextContent(mensagens.etapas.identidade);
    expect(itens[0]).toHaveTextContent(mensagens.wizard.estado.concluida);
    expect(itens[1]).toHaveTextContent(mensagens.wizard.estado.assumida);
  });

  it('etapa à frente não é clicável, etapa já vista navega', () => {
    const onIr = vi.fn();
    render(<TrilhaEtapas etapas={etapas} atual="design" concluidas={['identidade']} assumidas={[]} onIr={onIr} />);
    const itens = screen.getAllByRole('button');
    expect(itens[3]).toBeDisabled();
    expect(itens[2]).toBeDisabled();
    fireEvent.click(itens[0]);
    expect(onIr).toHaveBeenCalledWith('identidade');
  });
});
