import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup, configure } from '@testing-library/react';

// O padrão da testing-library é 1s para `findBy*` e `waitFor`. A suíte roda 96 arquivos em
// paralelo, cada um montando o seu jsdom, e sob essa carga 1s é curto demais para uma espera
// legítima: o teste falha por relógio, não por defeito, e passa sozinho na rodada seguinte.
// Falso vermelho é pior que suíte lenta, porque ensina a ignorar o vermelho.
configure({ asyncUtilTimeout: 5000 });

afterEach(() => {
  cleanup();
  try {
    sessionStorage.clear();
  } catch {
    // ambiente sem sessionStorage
  }
});
