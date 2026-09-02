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
          include: ['server/**/*.test.js', 'shared/**/*.test.js'],
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
