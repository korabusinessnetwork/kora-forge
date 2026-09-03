import { describe, it, expect } from 'vitest';
import configurar from './vite.config.js';

const resolver = (env = {}) => configurar({ mode: 'development', command: 'serve', ...env });

describe('vite.config', () => {
  // Sem `ws: true` o Vite não encaminha o handshake de upgrade, e o log ao vivo
  // (`/api/ws/runs/:runId`) fica mudo em `npm run forge`, que é o único jeito de usar o produto
  // em desenvolvimento. O servidor estaria certo e a tela ficaria muda, que é o pior dos dois.
  it('o proxy de /api encaminha WebSocket', () => {
    const proxy = resolver().server.proxy['/api'];
    expect(proxy.ws).toBe(true);
  });

  it('o proxy aponta para a API local e reescreve o Host, que a guarda confere', () => {
    const proxy = resolver().server.proxy['/api'];
    expect(proxy.target).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
    expect(proxy.changeOrigin).toBe(true);
  });

  // S-01: bind exclusivo em 127.0.0.1, nunca 0.0.0.0 nem IP de rede.
  it('o dev server liga só em 127.0.0.1, com porta fixa', () => {
    const { server, preview } = resolver();
    expect(server.host).toBe('127.0.0.1');
    expect(server.port).toBe(5173);
    expect(server.strictPort).toBe(true);
    expect(preview.host).toBe('127.0.0.1');
  });
});
