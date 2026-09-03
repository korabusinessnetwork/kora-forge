import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PassoWizard from './PassoWizard.jsx';
import { mensagens } from '../../../mensagens.js';

const m = mensagens.wizard;
const base = { titulo: 'Identidade', microtexto: 'micro', indice: 0, total: 6, onAvancar: vi.fn(), onPular: vi.fn(), onVoltar: vi.fn() };

describe('PassoWizard', () => {
  it('mostra contador real, título, microtexto e os campos', () => {
    render(<PassoWizard {...base} indice={2} total={6}><p>campos aqui</p></PassoWizard>);
    expect(screen.getByText(m.etapaXdeY(3, 6))).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Identidade' })).toBeInTheDocument();
    expect(screen.getByText('campos aqui')).toBeInTheDocument();
    expect(screen.getByText(m.notaSalvamento)).toBeInTheDocument();
  });

  it('sem avisos a região não é renderizada', () => {
    const { rerender } = render(<PassoWizard {...base} />);
    expect(screen.queryByRole('region', { name: m.avisos })).toBeNull();
    rerender(<PassoWizard {...base} avisos={[<p key="1">RLS obrigatório</p>]} />);
    expect(screen.getByRole('region', { name: m.avisos })).toHaveTextContent('RLS obrigatório');
  });

  it('primeira etapa esconde voltar, última troca avançar por concluir', () => {
    const { rerender } = render(<PassoWizard {...base} onVoltar={null} />);
    expect(screen.queryByRole('button', { name: m.voltar })).toBeNull();
    expect(screen.getByRole('button', { name: m.avancar })).toBeInTheDocument();
    rerender(<PassoWizard {...base} indice={5} total={6} />);
    expect(screen.getByRole('button', { name: m.concluir })).toBeInTheDocument();
  });

  it('pular aparece só quando permitido e dispara o callback', () => {
    const onPular = vi.fn();
    const { rerender } = render(<PassoWizard {...base} podePular={false} />);
    expect(screen.queryByRole('button', { name: m.pular })).toBeNull();
    rerender(<PassoWizard {...base} podePular onPular={onPular} />);
    fireEvent.click(screen.getByRole('button', { name: m.pular }));
    expect(onPular).toHaveBeenCalled();
  });

  it('salvando desabilita a navegação e erro vira alerta com tentar de novo', () => {
    const onTentarDeNovo = vi.fn();
    const { rerender } = render(<PassoWizard {...base} podePular salvando />);
    expect(screen.getByRole('button', { name: m.voltar })).toBeDisabled();
    expect(screen.getByRole('button', { name: m.pular })).toBeDisabled();
    rerender(<PassoWizard {...base} erro="caiu" onTentarDeNovo={onTentarDeNovo} />);
    expect(screen.getByRole('alert')).toHaveTextContent('caiu');
    fireEvent.click(screen.getByRole('button', { name: mensagens.estados.tentarDeNovo }));
    expect(onTentarDeNovo).toHaveBeenCalled();
  });
});
