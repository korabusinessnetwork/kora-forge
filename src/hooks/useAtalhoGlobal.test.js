import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { estaDigitando, combinaComAtalho, useAtalhoGlobal } from './useAtalhoGlobal.js';

const tecla = (extra = {}) => ({ key: 'i', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...extra });

describe('combinaComAtalho', () => {
  it('aceita Ctrl e aceita Cmd, um de cada vez', () => {
    expect(combinaComAtalho(tecla({ ctrlKey: true }), 'i')).toBe(true);
    expect(combinaComAtalho(tecla({ metaKey: true }), 'i')).toBe(true);
  });

  it('aceita a letra maiúscula, porque Caps Lock não deveria mudar o atalho', () => {
    expect(combinaComAtalho(tecla({ key: 'I', ctrlKey: true }), 'i')).toBe(true);
  });

  it.each([
    ['sem modificador', tecla()],
    ['Ctrl e Cmd juntos', tecla({ ctrlKey: true, metaKey: true })],
    ['com Alt', tecla({ ctrlKey: true, altKey: true })],
    ['com Shift', tecla({ ctrlKey: true, shiftKey: true })],
    ['outra tecla', tecla({ key: 'k', ctrlKey: true })],
  ])('recusa %s', (_rotulo, evento) => {
    expect(combinaComAtalho(evento, 'i')).toBe(false);
  });
});

describe('estaDigitando', () => {
  it.each(['INPUT', 'TEXTAREA', 'SELECT'])('reconhece %s', (tagName) => {
    expect(estaDigitando({ tagName, isContentEditable: false })).toBe(true);
  });

  it('reconhece elemento editável', () => {
    expect(estaDigitando({ tagName: 'DIV', isContentEditable: true })).toBe(true);
  });

  it('não reconhece o resto, nem alvo ausente', () => {
    expect(estaDigitando({ tagName: 'DIV', isContentEditable: false })).toBe(false);
    expect(estaDigitando({ tagName: 'BUTTON', isContentEditable: false })).toBe(false);
    expect(estaDigitando(null)).toBe(false);
  });
});

describe('useAtalhoGlobal', () => {
  function alvoFalso() {
    const ouvintes = new Set();
    return {
      addEventListener: (_nome, fn) => ouvintes.add(fn),
      removeEventListener: (_nome, fn) => ouvintes.delete(fn),
      disparar: (evento) => ouvintes.forEach((fn) => fn(evento)),
      get quantidade() { return ouvintes.size; },
    };
  }

  const eventoDe = (extra = {}) => ({ ...tecla({ ctrlKey: true }), target: { tagName: 'BODY', isContentEditable: false }, preventDefault: vi.fn(), ...extra });

  it('dispara e cancela o padrão do browser', () => {
    const alvo = alvoFalso();
    const aoDisparar = vi.fn();
    renderHook(() => useAtalhoGlobal('i', aoDisparar, { alvo }));

    const evento = eventoDe();
    alvo.disparar(evento);
    expect(aoDisparar).toHaveBeenCalledTimes(1);
    expect(evento.preventDefault).toHaveBeenCalled();
  });

  it('não dispara enquanto o usuário digita num campo', () => {
    const alvo = alvoFalso();
    const aoDisparar = vi.fn();
    renderHook(() => useAtalhoGlobal('i', aoDisparar, { alvo }));

    const evento = eventoDe({ target: { tagName: 'INPUT', isContentEditable: false } });
    alvo.disparar(evento);
    expect(aoDisparar).not.toHaveBeenCalled();
    expect(evento.preventDefault).not.toHaveBeenCalled();
  });

  it('desligado não assina evento nenhum', () => {
    const alvo = alvoFalso();
    const aoDisparar = vi.fn();
    renderHook(() => useAtalhoGlobal('i', aoDisparar, { alvo, ativo: false }));

    expect(alvo.quantidade).toBe(0);
  });

  it('desmontar solta o ouvinte', () => {
    const alvo = alvoFalso();
    const { unmount } = renderHook(() => useAtalhoGlobal('i', vi.fn(), { alvo }));

    expect(alvo.quantidade).toBe(1);
    unmount();
    expect(alvo.quantidade).toBe(0);
  });
});
