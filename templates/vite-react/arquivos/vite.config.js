import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// {{PROJETO}}, gerado pelo KORA FORGE em {{DATA}}.
export default defineConfig({
  plugins: [react()],
  // 5273 e não a 5173 padrão do Vite: essa é a porta do dev server do próprio KORA FORGE, e com
  // ele aberto o projeto escorregaria de porta a cada vez. Sem strictPort de propósito, porque
  // rodar dois projetos ao mesmo tempo é normal, e escorregar é melhor que falhar.
  server: { port: 5273 },
  build: { outDir: 'dist' },
});
