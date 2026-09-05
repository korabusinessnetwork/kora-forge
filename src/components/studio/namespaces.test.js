import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

// Guarda de arquitetura do padrão P-06: existem dois design systems neste produto e eles nunca se
// misturam. A regra vale nos **dois** sentidos, e é por isso que são dois testes e não um:
//
//   - nenhum `--forge-*` dentro da zona do projeto, senão o preview mostra o projeto com a cara da
//     ferramenta e mente sobre o que vai sair no disco;
//   - nenhum `--projeto-*` fora dela, senão o token do projeto vaza para a UI do Forge.
//
// A raiz vem do cwd, e não de `import.meta.url`: este teste roda no ambiente jsdom, onde a URL do
// módulo não é `file:`. O vitest sempre roda da raiz do repositório.
const RAIZ = path.join(process.cwd(), 'src');

// A zona do projeto é uma lista, e não uma pasta só: desde o bloco 4 ela tem dois moradores, a
// amostra de tokens e os itens que o canvas desenha. O palco isolado mora em `itens/` e é usado
// pelos dois, para não existir dois chões diferentes onde o preview possa passar a mentir.
const ZONA_DO_PROJETO = [
  path.join(RAIZ, 'components', 'studio', 'PreviewProjeto'),
  path.join(RAIZ, 'components', 'studio', 'itens'),
];
const PALCO = path.join(RAIZ, 'components', 'studio', 'itens', 'PalcoProjeto.module.css');
const naZona = (arquivo) => ZONA_DO_PROJETO.some((pasta) => arquivo.startsWith(pasta));
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

const arquivosDaZona = () => ZONA_DO_PROJETO.flatMap(arquivosDe);

const relativo = (arquivo) => path.relative(RAIZ, arquivo).split(path.sep).join('/');

describe('os dois namespaces de token (P-06)', () => {
  it('a zona do projeto não lê nenhum token da ferramenta', () => {
    const problemas = [];
    for (const arquivo of arquivosDaZona()) {
      const achados = fs.readFileSync(arquivo, 'utf8').match(/--forge-[a-z0-9-]+/g) ?? [];
      for (const token of new Set(achados)) problemas.push(`${relativo(arquivo)}: ${token}`);
    }
    expect(problemas).toEqual([]);
  });

  it('nenhum token do projeto vaza para fora da zona do projeto', () => {
    const problemas = [];
    for (const arquivo of arquivosDe(RAIZ)) {
      if (naZona(arquivo)) continue;
      const achados = fs.readFileSync(arquivo, 'utf8').match(/--projeto-[a-z0-9-]+/g) ?? [];
      for (const token of new Set(achados)) problemas.push(`${relativo(arquivo)}: ${token}`);
    }
    expect(problemas).toEqual([]);
  });

  it('o palco declara fundo, cor e fonte em vez de herdar os da ferramenta', () => {
    const css = fs.readFileSync(PALCO, 'utf8');
    expect(css).toMatch(/background:\s*var\(--projeto-cor-fundo\)/);
    expect(css).toMatch(/color:\s*var\(--projeto-cor-texto\)/);
    expect(css).toMatch(/font-family:\s*var\(--projeto-fonte-ui\)/);
  });

  it('a zona do projeto não escreve em :root, html nem body, que é por onde vazaria', () => {
    const seletores = [];
    for (const arquivo of arquivosDaZona()) {
      if (path.extname(arquivo) !== '.css') continue;
      const css = fs.readFileSync(arquivo, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      for (const achado of css.match(/^\s*(:root|html|body)\b/gm) ?? []) seletores.push(`${relativo(arquivo)}: ${achado.trim()}`);
    }
    expect(seletores).toEqual([]);
  });

  it('a UI da ferramenta continua sendo escrita só com --forge-*', () => {
    const semToken = [];
    for (const arquivo of arquivosDe(RAIZ)) {
      if (naZona(arquivo) || path.extname(arquivo) !== '.css') continue;
      if (arquivo.startsWith(path.join(RAIZ, 'styles'))) continue;
      const conteudo = fs.readFileSync(arquivo, 'utf8');
      if (/var\(--/.test(conteudo) && !/var\(--forge-/.test(conteudo)) semToken.push(relativo(arquivo));
    }
    expect(semToken).toEqual([]);
  });
});
