import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AvisoRegra from './AvisoRegra.jsx';
import { mensagens } from '../../../mensagens.js';

const m = mensagens.regras;
const hit = (extra = {}) => ({
  id: 'h1', regraId: 'custo-servico-pago', severidade: 'aviso', estado: 'aberto',
  titulo: 'Serviço fora do tier gratuito', explicacao: 'A fase é bootstrap.',
  etapa: 'seguranca', campo: 'seguranca.tierGratuito', dispensavel: true, resolucao: 'humana',
  efeitos: [{ tipo: 'avisar' }], justificativa: null, ...extra,
});
const renderizar = (props = {}) => {
  const onDecidir = vi.fn();
  render(<AvisoRegra hit={hit()} onDecidir={onDecidir} {...props} />);
  return onDecidir;
};

describe('AvisoRegra', () => {
  it('mostra severidade, título e explicação', () => {
    renderizar();
    expect(screen.getByText(m.severidade.aviso)).toBeInTheDocument();
    expect(screen.getByText('Serviço fora do tier gratuito')).toBeInTheDocument();
    expect(screen.getByText('A fase é bootstrap.')).toBeInTheDocument();
  });

  it('dispensável pede justificativa e só envia com o mínimo de caracteres', () => {
    const onDecidir = renderizar();
    fireEvent.click(screen.getByRole('button', { name: m.dispensar }));
    const campo = screen.getByLabelText(m.justificativa.rotulo);
    fireEvent.change(campo, { target: { value: 'curta' } });
    fireEvent.click(screen.getByRole('button', { name: m.confirmarDispensa }));
    expect(screen.getByRole('alert')).toHaveTextContent(m.justificativa.curta);
    expect(onDecidir).not.toHaveBeenCalled();

    fireEvent.change(campo, { target: { value: 'A Vercel cobre isso no plano gratuito.' } });
    fireEvent.click(screen.getByRole('button', { name: m.confirmarDispensa }));
    expect(onDecidir).toHaveBeenCalledWith({ estado: 'dispensado', justificativa: 'A Vercel cobre isso no plano gratuito.' });
  });

  it('cancelar fecha o formulário sem decidir', () => {
    const onDecidir = renderizar();
    fireEvent.click(screen.getByRole('button', { name: m.dispensar }));
    fireEvent.click(screen.getByRole('button', { name: m.cancelar }));
    expect(screen.queryByLabelText(m.justificativa.rotulo)).toBeNull();
    expect(onDecidir).not.toHaveBeenCalled();
  });

  it('resolução automática não oferece ação, só explica que o plano cuida', () => {
    render(<AvisoRegra hit={hit({ resolucao: 'automatica', dispensavel: false, estado: 'resolvido' })} onDecidir={vi.fn()} />);
    expect(screen.getByText(m.automatico)).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('bloqueio não dispensável não oferece dispensar nem ignorar', () => {
    render(<AvisoRegra hit={hit({ severidade: 'bloqueio', dispensavel: false })} onDecidir={vi.fn()} />);
    expect(screen.getByText(m.severidade.bloqueio)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: m.dispensar })).toBeNull();
    expect(screen.queryByRole('button', { name: m.ignorar })).toBeNull();
  });

  it('info não dispensável pode ser ignorada', () => {
    const onDecidir = vi.fn();
    render(<AvisoRegra hit={hit({ severidade: 'info', dispensavel: false })} onDecidir={onDecidir} />);
    fireEvent.click(screen.getByRole('button', { name: m.ignorar }));
    expect(onDecidir).toHaveBeenCalledWith({ estado: 'ignorado' });
  });

  it('já decidido mostra a justificativa e oferece reabrir', () => {
    const onDecidir = vi.fn();
    render(<AvisoRegra hit={hit({ estado: 'dispensado', justificativa: 'decidido com o dono' })} onDecidir={onDecidir} />);
    expect(screen.getByText(/decidido com o dono/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: m.reabrir }));
    expect(onDecidir).toHaveBeenCalledWith({ estado: 'aberto' });
  });

  it('erro do servidor aparece junto do campo de justificativa', () => {
    render(<AvisoRegra hit={hit()} onDecidir={vi.fn()} erro="Diga em ao menos 10 caracteres." />);
    fireEvent.click(screen.getByRole('button', { name: m.dispensar }));
    expect(screen.getByRole('alert')).toHaveTextContent('Diga em ao menos 10 caracteres.');
  });
});
