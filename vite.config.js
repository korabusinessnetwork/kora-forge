import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// O front fala com a API local por caminho relativo (/api). Em dev, o Vite faz proxy para o
// Fastify; em produção, o Fastify serve dist/ na própria origem. Host fixo em 127.0.0.1 (S-01).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'FORGE_');
  const portaApi = Number(env.FORGE_PORT) || 7337;
  return {
    plugins: [react()],
    resolve: {
      alias: { '@shared': fileURLToPath(new URL('./shared', import.meta.url)) },
    },
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      proxy: {
        // `ws: true` nao e detalhe: sem ele o Vite nao encaminha o handshake de upgrade, e o
        // log ao vivo (`/api/ws/runs/:runId`) fica mudo em `npm run forge`, que e o unico jeito
        // de usar o produto em desenvolvimento. `vite.config.test.js` guarda esta linha.
        '/api': { target: `http://127.0.0.1:${portaApi}`, changeOrigin: true, ws: true },
      },
    },
    preview: { host: '127.0.0.1' },
    build: { outDir: 'dist', sourcemap: false },
  };
});
