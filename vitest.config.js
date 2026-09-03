import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const alias = { '@shared': fileURLToPath(new URL('./shared', import.meta.url)) };

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'server',
          environment: 'node',
          // `vite.config.test.js` guarda a configuração do dev server, que roda em Node e não no
          // browser: o proxy de `/api` precisa encaminhar WebSocket, senão o log ao vivo cala.
          include: ['server/**/*.test.js', 'shared/**/*.test.js', 'vite.config.test.js'],
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: 'web',
          environment: 'jsdom',
          include: ['src/**/*.test.{js,jsx}'],
          setupFiles: ['./src/testes/setup.js'],
        },
      },
    ],
  },
});
