import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

// Guarda de arquitetura: componente e feature nunca falam com a API local direto. Todo acesso
// passa pela camada de serviços (padrão Kora, regra 1 de docs/06_COMPONENTES). Vale para `fetch`
// e vale igual para `WebSocket`, que é o canal do log ao vivo.
//
// A varredura é por exclusão, e não por lista de pastas: tudo em `src/` fora de `src/services/`
// está proibido de tocar na rede. Pasta nova de feature entra na guarda sozinha, em vez de
// depender de alguém lembrar de acrescentá-la aqui.
//
// A raiz vem do cwd, e não de `import.meta.url`: este teste roda no ambiente jsdom, onde a URL
// do módulo não é `file:`. O vitest sempre roda da raiz do repositório.
const RAIZ = path.join(process.cwd(), 'src');
const SERVICOS = path.join(RAIZ, 'services');
const EXTENSOES = new Set(['.js', '.jsx']);

// Só código conta. `refetch()` do TanStack Query e comentário citando WebSocket não são acesso
// direto, e sem tirar comentário da conta a guarda viraria ruído.
const semComentario = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const PROIBIDOS = [
  { rotulo: 'fetch', padrao: /(?<![\w.])fetch\s*\(/ },
  { rotulo: 'WebSocket', padrao: /\bWebSocket\b/ },
  { rotulo: 'XMLHttpRequest', padrao: /\bXMLHttpRequest\b/ },
  { rotulo: 'EventSource', padrao: /\bEventSource\b/ },
];

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

describe('camada de serviços', () => {
  it('nada fora de src/services fala com a rede: nem componente, nem feature, nem hook', () => {
    const problemas = [];
    for (const arquivo of arquivosDe(RAIZ)) {
      if (arquivo.startsWith(SERVICOS)) continue;
      const conteudo = semComentario(fs.readFileSync(arquivo, 'utf8'));
      for (const { rotulo, padrao } of PROIBIDOS) {
        if (padrao.test(conteudo)) problemas.push(`${path.relative(RAIZ, arquivo)}: ${rotulo}`);
      }
    }
    expect(problemas).toEqual([]);
  });

  it('a camada de serviços existe e é ela quem fala com a API local', () => {
    const servicos = fs.readdirSync(SERVICOS);
    expect(servicos).toContain('api.js');
    expect(servicos).toContain('logDeRun.js');
  });

  it('e mantém o acesso injetável, para o teste não depender de rede de verdade', () => {
    expect(fs.readFileSync(path.join(SERVICOS, 'api.js'), 'utf8')).toMatch(/fetchImpl/);
    expect(fs.readFileSync(path.join(SERVICOS, 'logDeRun.js'), 'utf8')).toMatch(/criarSocket/);
  });
});
