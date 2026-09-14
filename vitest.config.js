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
          // Parte destes testes executa `npm` de verdade, porque é a única forma de provar o
          // runner nas duas plataformas (R-08). Subir o npm no Windows custa segundos, e o teste do
          // timeout do R-12 espera 4s de propósito antes de conferir que a árvore morreu: não cabe
          // no teto padrão de 5s por teste. O teto continua servindo para pegar teste travado.
          testTimeout: 30000,
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
          // Uma espera de até 5s (`asyncUtilTimeout` em `setup.js`) não cabe no teto padrão de 5s
          // por teste, e um teste com duas esperas caberia menos ainda. O teto serve para pegar
          // teste travado, não para cronometrar máquina sob carga.
          testTimeout: 20000,
        },
      },
    ],
  },
});
