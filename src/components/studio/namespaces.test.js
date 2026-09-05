import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

// Guarda de arquitetura do padrão P-06: existem dois design systems neste produto e eles nunca se
// misturam. A regra vale nos **dois** sentidos, e é por isso que são dois testes e não um:
//
//   - nenhum `--forge-*` dentro do preview, senão o preview mostra o projeto com a cara da
//     ferramenta e mente sobre o que vai sair no disco;
//   - nenhum `--projeto-*` fora do preview, senão o token do projeto vaza para a UI do Forge.
//
// A raiz vem do cwd, e não de `import.meta.url`: este teste roda no ambiente jsdom, onde a URL do
// módulo não é `file:`. O vitest sempre roda da raiz do repositório.
const RAIZ = path.join(process.cwd(), 'src');
const PREVIEW = path.join(RAIZ, 'components', 'studio', 'PreviewProjeto');
const EXTENSOES = new Set(['.js', '.jsx', '.css']);

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

describe('os dois namespaces de token (P-06)', () => {
  it('o preview do Studio não lê nenhum token da ferramenta', () => {
    const problemas = [];
    for (const arquivo of arquivosDe(PREVIEW)) {
      const achados = fs.readFileSync(arquivo, 'utf8').match(/--forge-[a-z0-9-]+/g) ?? [];
      for (const token of new Set(achados)) problemas.push(`${relativo(arquivo)}: ${token}`);
    }
    expect(problemas).toEqual([]);
  });

  it('nenhum token do projeto vaza para fora do preview', () => {
    const problemas = [];
    for (const arquivo of arquivosDe(RAIZ)) {
      if (arquivo.startsWith(PREVIEW)) continue;
      const achados = fs.readFileSync(arquivo, 'utf8').match(/--projeto-[a-z0-9-]+/g) ?? [];
      for (const token of new Set(achados)) problemas.push(`${relativo(arquivo)}: ${token}`);
    }
    expect(problemas).toEqual([]);
  });

  it('o palco do preview declara fundo, cor e fonte em vez de herdar os da ferramenta', () => {
    const css = fs.readFileSync(path.join(PREVIEW, 'PreviewProjeto.module.css'), 'utf8');
    expect(css).toMatch(/background:\s*var\(--projeto-cor-fundo\)/);
    expect(css).toMatch(/color:\s*var\(--projeto-cor-texto\)/);
    expect(css).toMatch(/font-family:\s*var\(--projeto-fonte-ui\)/);
  });

  it('o preview não escreve em :root, html nem body, que é por onde vazaria', () => {
    const css = fs.readFileSync(path.join(PREVIEW, 'PreviewProjeto.module.css'), 'utf8');
    const seletores = css.replace(/\/\*[\s\S]*?\*\//g, '').match(/^\s*(:root|html|body)\b/gm) ?? [];
    expect(seletores).toEqual([]);
  });

  it('a UI da ferramenta continua sendo escrita só com --forge-*', () => {
    const semToken = [];
    for (const arquivo of arquivosDe(RAIZ)) {
      if (arquivo.startsWith(PREVIEW) || path.extname(arquivo) !== '.css') continue;
      if (arquivo.startsWith(path.join(RAIZ, 'styles'))) continue;
      const conteudo = fs.readFileSync(arquivo, 'utf8');
      if (/var\(--/.test(conteudo) && !/var\(--forge-/.test(conteudo)) semToken.push(relativo(arquivo));
    }
    expect(semToken).toEqual([]);
  });
});
