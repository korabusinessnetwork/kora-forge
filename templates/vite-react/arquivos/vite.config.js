import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// {{PROJETO}}, gerado pelo KORA FORGE em {{DATA}}.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: { outDir: 'dist' },
});
