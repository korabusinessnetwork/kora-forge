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
        '/api': { target: `http://127.0.0.1:${portaApi}`, changeOrigin: true },
      },
    },
    preview: { host: '127.0.0.1' },
    build: { outDir: 'dist', sourcemap: false },
  };
});
