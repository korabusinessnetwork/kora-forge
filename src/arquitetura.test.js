import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

// Guarda de arquitetura do padrão do CLAUDE.md: "todo acesso a dado passa pela camada de
// serviços; componente nunca fala com fetch direto". A regra estava escrita e testada em lugar
// nenhum, então valia só enquanto alguém lembrasse dela. Aqui ela falha a suíte.
//
// `src/services/` é o único lugar autorizado a tocar em `fetch` e em `WebSocket`, e mesmo lá o
// acesso é injetável, para o teste não depender de rede.
const RAIZ = path.join(process.cwd(), 'src');
const SERVICOS = path.join(RAIZ, 'services');
const EXTENSOES = new Set(['.js', '.jsx']);

function arquivosDe(pasta) {
  const encontrados = [];
  const caminhar = (atual) => {
    for (const entrada of fs.readdirSync(atual, { withFileTypes: true })) {
      const completo = path.join(atual, entrada.name);
      if (entrada.isDirectory()) caminhar(completo);
      else if (EXTENSOES.has(path.extname(entrada.name)) && !entrada.name.includes('.test.')) encontrados.push(completo);
    }
  };
  caminhar(pasta);
  return encontrados;
}

const relativo = (arquivo) => path.relative(RAIZ, arquivo).split(path.sep).join('/');

// Só código conta. `refetch()` do TanStack Query e comentário citando WebSocket não são acesso
// direto, e sem tirar comentário da conta a guarda viraria ruído.
const semComentario = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const PROIBIDOS = [
  { rotulo: 'fetch', padrao: /(?<![\w.])fetch\s*\(/ },
  { rotulo: 'XMLHttpRequest', padrao: /\bXMLHttpRequest\b/ },
  { rotulo: 'WebSocket', padrao: /\bWebSocket\b/ },
  { rotulo: 'EventSource', padrao: /\bEventSource\b/ },
];

describe('a camada de serviços é o único caminho até a API local', () => {
  it('nenhum componente, página ou hook fala com a rede por conta própria', () => {
    const problemas = [];
    for (const arquivo of arquivosDe(RAIZ)) {
      if (arquivo.startsWith(SERVICOS)) continue;
      const codigo = semComentario(fs.readFileSync(arquivo, 'utf8'));
      for (const { rotulo, padrao } of PROIBIDOS) {
        if (padrao.test(codigo)) problemas.push(`${relativo(arquivo)}: ${rotulo}`);
      }
    }
    expect(problemas).toEqual([]);
  });

  it('a própria camada de serviços mantém o acesso injetável, para o teste não depender de rede', () => {
    const api = fs.readFileSync(path.join(SERVICOS, 'api.js'), 'utf8');
    expect(api).toMatch(/fetchImpl/);
    const socket = fs.readFileSync(path.join(SERVICOS, 'logDeRun.js'), 'utf8');
    expect(socket).toMatch(/criarSocket/);
  });
});
