import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Campo from './Campo.jsx';

describe('Campo', () => {
  it('associa rótulo, microtexto e valor padrão ao controle', () => {
    render(<Campo id="ws" rotulo="Workspace" microtexto="Pasta raiz." padrao="nenhum" />);
    const entrada = screen.getByLabelText('Workspace');
    expect(entrada).toHaveAccessibleDescription('Pasta raiz. Padrão: nenhum.');
    expect(entrada).not.toHaveAttribute('aria-invalid');
  });

  it('mostra erro com role alert e marca aria-invalid', () => {
    render(<Campo id="ws" rotulo="Workspace" microtexto="Pasta raiz." erro="Essa pasta não existe." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Essa pasta não existe.');
    expect(screen.getByLabelText('Workspace')).toHaveAttribute('aria-invalid', 'true');
  });

  it('exige microtexto', () => {
    // React relança o erro de render e o jsdom o reporta como não capturado: silencia os dois.
    const silencio = vi.spyOn(console, 'error').mockImplementation(() => {});
    const engolir = (evento) => evento.preventDefault();
    window.addEventListener('error', engolir);
    try {
      expect(() => render(<Campo id="x" rotulo="X" />)).toThrow(/microtexto/);
    } finally {
      window.removeEventListener('error', engolir);
      silencio.mockRestore();
    }
  });

  it('aceita controle externo via children com o mesmo id', () => {
    render(
      <Campo id="tema" rotulo="Tema" microtexto="Aparência.">
        <select id="tema"><option value="escuro">Escuro</option></select>
      </Campo>,
    );
    expect(screen.getByLabelText('Tema')).toHaveValue('escuro');
  });
});
