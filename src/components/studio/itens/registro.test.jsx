import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RENDERIZADORES, renderizadorDe } from './registro.js';
import PalcoProjeto from './PalcoProjeto.jsx';
import { TOKENS_PADRAO } from '@shared/schemas/design.js';

// Guarda de sincronia entre o catálogo e o canvas. O item existe duas vezes no produto: como
// `fragmento.jsx` no catálogo, que o bloco 6 vai escrever no disco, e como componente React aqui,
// que o canvas desenha agora. Interpretar o fragmento no navegador seria compilar JSX em tempo de
// execução, e isso é proibido; então há duas encarnações, e a sincronia entre elas é **teste**,
// não intenção. É a mesma lição do bloco 3, onde o próprio fragmento é conferido contra as props.
//
// O catálogo é lido do disco, e não de um mock: o que este teste protege é o catálogo real.
const RAIZ = process.cwd();
const PASTA_CATALOGO = path.join(RAIZ, 'catalogo');
const PASTA_ITENS = path.join(RAIZ, 'src', 'components', 'studio', 'itens');

const ITENS = fs
  .readdirSync(PASTA_CATALOGO, { withFileTypes: true })
  .filter((entrada) => entrada.isDirectory())
  .map((entrada) => JSON.parse(fs.readFileSync(path.join(PASTA_CATALOGO, entrada.name, 'item.json'), 'utf8')));

const fonteDe = (id) => fs.readFileSync(path.join(PASTA_ITENS, RENDERIZADORES[id].arquivo), 'utf8');

// Lê o que o componente de fato consome, e não uma lista declarada ao lado: lista ao lado é mais
// uma coisa para ficar velha. É por isso que a convenção da pasta proíbe desestruturar `props`.
const propsLidas = (fonte) => new Set([...fonte.matchAll(/props\.([a-zA-Z0-9_]+)/g)].map((achado) => achado[1]));

const ordenar = (lista) => [...lista].sort();

describe('todo item do catálogo tem renderizador, e nenhum renderizador sobra', () => {
  it('os dois conjuntos de ids são exatamente o mesmo', () => {
    expect(ordenar(Object.keys(RENDERIZADORES))).toEqual(ordenar(ITENS.map((item) => item.id)));
  });

  it('o arquivo apontado por cada renderizador existe de verdade', () => {
    for (const [id, entrada] of Object.entries(RENDERIZADORES)) {
      expect(fs.existsSync(path.join(PASTA_ITENS, entrada.arquivo)), `${id} aponta para ${entrada.arquivo}`).toBe(true);
      expect(typeof entrada.componente).toBe('function');
    }
  });

  it('tipo que saiu do catálogo devolve null, para o canvas desenhar a caixa de desconhecido', () => {
    expect(renderizadorDe('carrossel')).toBe(null);
  });
});

describe('cada renderizador consome exatamente as props que o item declara', () => {
  it('prop declarada que ninguém desenha derruba a suíte', () => {
    const faltando = [];
    for (const item of ITENS) {
      const lidas = propsLidas(fonteDe(item.id));
      for (const prop of item.props) {
        if (!lidas.has(prop.id)) faltando.push(`${item.id}: ${prop.id}`);
      }
    }
    expect(faltando).toEqual([]);
  });

  it('prop desenhada que o catálogo não declara também', () => {
    const sobrando = [];
    for (const item of ITENS) {
      const declaradas = new Set(item.props.map((prop) => prop.id));
      for (const lida of propsLidas(fonteDe(item.id))) {
        if (!declaradas.has(lida)) sobrando.push(`${item.id}: ${lida}`);
      }
    }
    expect(sobrando).toEqual([]);
  });

  it('quem aceita filhos usa children, e quem não aceita não usa', () => {
    const problemas = [];
    for (const item of ITENS) {
      // `{children}` no JSX, e não a palavra na assinatura: o que interessa é se os filhos são
      // desenhados, que é o `{{FILHOS}}` do fragmento.
      const usa = /\{children\}/.test(fonteDe(item.id));
      const container = item.aceita.length > 0;
      if (usa !== container) problemas.push(`${item.id}: aceita ${item.aceita.length} filhos e ${usa ? 'usa' : 'não usa'} children`);
    }
    expect(problemas).toEqual([]);
  });

  it('nenhum renderizador desestrutura props, que é a convenção de que a guarda depende', () => {
    const problemas = [];
    for (const item of ITENS) {
      const fonte = fonteDe(item.id);
      if (/const\s*\{[^}]*\}\s*=\s*props/.test(fonte)) problemas.push(item.id);
    }
    expect(problemas).toEqual([]);
  });
});

describe('os itens desenham', () => {
  const desenhar = (id, props, filhos = null) => {
    const Componente = renderizadorDe(id);
    return render(
      <PalcoProjeto tokens={TOKENS_PADRAO} rotulo="palco">
        <Componente props={props}>{filhos}</Componente>
      </PalcoProjeto>,
    );
  };

  const padroesDe = (id) => Object.fromEntries(ITENS.find((item) => item.id === id).props.map((prop) => [prop.id, prop.padrao]));

  it('todo item desenha com os padrões do catálogo, sem estourar', () => {
    for (const item of ITENS) {
      const { unmount } = desenhar(item.id, padroesDe(item.id), <span>filho</span>);
      unmount();
    }
  });

  it('o nível do título vira a tag, como no fragmento do catálogo', () => {
    desenhar('titulo', { texto: 'Bem-vindo', nivel: '1' });
    expect(screen.getByRole('heading', { level: 1, name: 'Bem-vindo' })).toBeInTheDocument();
  });

  it('a imagem sai com o texto alternativo, que o catálogo declara como obrigatório', () => {
    desenhar('imagem', { origem: '/a.svg', alternativo: 'Um gráfico de barras' });
    expect(screen.getByRole('img', { name: 'Um gráfico de barras' })).toBeInTheDocument();
  });

  it('container desenha os filhos que recebe', () => {
    desenhar('secao', { espacamento: 'normal' }, <p>dentro da seção</p>);
    expect(screen.getByText('dentro da seção')).toBeInTheDocument();
  });

  it('o palco aplica os tokens do projeto como custom properties, e nenhum token da ferramenta', () => {
    const { container } = desenhar('texto', { conteudo: 'oi' });
    const palco = container.querySelector('[role="region"]');
    expect(palco.getAttribute('style')).toContain('--projeto-cor-fundo');
    expect(palco.getAttribute('style')).not.toContain('--forge-');
  });
});
