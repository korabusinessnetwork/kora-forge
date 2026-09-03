import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

// Guarda de arquitetura: componente e feature nunca falam com a API local direto. Todo acesso
// passa pela camada de serviços (padrão Kora, regra 1 de docs/06_COMPONENTES). Vale para `fetch`
// e vale igual para `WebSocket`, que é o canal do log ao vivo.
//
// A raiz vem do cwd, e não de `import.meta.url`: este teste roda no ambiente jsdom, onde a URL
// do módulo não é `file:`. O vitest sempre roda da raiz do repositório.
const RAIZ = path.join(process.cwd(), 'src');
const PASTAS_VIGIADAS = ['components', 'features', 'hooks'];
const EXTENSOES = new Set(['.js', '.jsx']);

const PROIBIDOS = [
  { rotulo: 'fetch', padrao: /\bfetch\s*\(/ },
  { rotulo: 'WebSocket', padrao: /\bnew\s+WebSocket\b/ },
  { rotulo: 'WebSocket global', padrao: /\bglobalThis\.WebSocket\b/ },
];

function arquivosDe(pasta) {
  const encontrados = [];
  const caminhar = (atual) => {
    for (const entrada of fs.readdirSync(atual, { withFileTypes: true })) {
      const completo = path.join(atual, entrada.name);
      if (entrada.isDirectory()) caminhar(completo);
      else if (EXTENSOES.has(path.extname(entrada.name))) encontrados.push(completo);
    }
  };
  caminhar(pasta);
  return encontrados;
}

describe('camada de serviços', () => {
  it('nenhum componente, feature ou hook chama fetch ou abre WebSocket direto', () => {
    const problemas = [];
    for (const pasta of PASTAS_VIGIADAS) {
      for (const arquivo of arquivosDe(path.join(RAIZ, pasta))) {
        if (arquivo.includes('.test.')) continue;
        const conteudo = fs.readFileSync(arquivo, 'utf8');
        for (const { rotulo, padrao } of PROIBIDOS) {
          if (padrao.test(conteudo)) problemas.push(`${path.relative(RAIZ, arquivo)}: ${rotulo}`);
        }
      }
    }
    expect(problemas).toEqual([]);
  });

  it('a camada de serviços existe e é ela quem fala com a API local', () => {
    const servicos = fs.readdirSync(path.join(RAIZ, 'services'));
    expect(servicos).toContain('api.js');
    expect(servicos).toContain('logDeRun.js');
  });
});
