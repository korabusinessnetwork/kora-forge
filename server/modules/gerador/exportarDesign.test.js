import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import { transformWithOxc } from 'vite';
import { exportarDesign, nomeDoComponente, APP, APP_ESTILOS, TEMPLATE_PAGINAS } from './exportarDesign.js';
import { carregarTemplatesBuiltin, PASTA_TEMPLATES_BUILTIN } from './servico.js';
import { carregarCatalogoBuiltin } from '../catalogo/servico.js';
import { criarPastaTemporaria } from '../../testes/apoio.js';

// Função pura: nenhum teste aqui sobe servidor nem abre banco (critério 24).
const CATALOGO = carregarCatalogoBuiltin();
const TEMPLATES = carregarTemplatesBuiltin();
const PAGINAS = TEMPLATES.find((t) => t.id === TEMPLATE_PAGINAS);
const VALORES = { PROJETO: 'Projeto de Teste' };

const exportar = (documento) => exportarDesign({ documento, catalogo: CATALOGO, moldes: PAGINAS.moldes, valores: VALORES });
const no = (id, tipo, props = {}, filhos = []) => ({ id, tipo, props, filhos });
const pagina = (id, rota, regioes = [], nome = 'Página') => ({ id, nome, rota, regioes });
const porDestino = (resultado) => new Map(resultado.arquivos.map((a) => [a.destino, a.conteudo]));

async function compila(codigo, nome) {
  await expect(transformWithOxc(codigo, `${nome}.jsx`, { lang: 'jsx' }), nome).resolves.toBeTruthy();
}

const temporarias = [];
afterEach(() => {
  while (temporarias.length > 0) fs.rmSync(temporarias.pop(), { recursive: true, force: true });
});

describe('exportarDesign, páginas viram arquivos e rotas', () => {
  const documento = {
    paginas: [
      pagina('inicio', '/', [
        no('topo', 'cabecalho', {}, [no('marca', 'titulo', { texto: 'Olá', nivel: '1' })]),
        no('corpo', 'secao', { espacamento: 'amplo' }, [
          no('chamada', 'texto', { conteudo: 'Bem-vindo' }),
          no('acao', 'botao', {}),
          no('card', 'cartao', {}, [no('titulo-card', 'titulo', { texto: 'Dentro' })]),
        ]),
      ], 'Início'),
      pagina('sobre-nos', '/sobre-nos', [], 'Sobre nós'),
    ],
  };

  it('gera uma página por id em PascalCase e um App com as rotas na ordem do documento', () => {
    const resultado = exportar(documento);
    expect(resultado.arquivos.map((a) => a.destino)).toEqual(['src/paginas/PaginaInicio.jsx', 'src/paginas/PaginaSobreNos.jsx', APP]);
    expect(resultado.substitui).toEqual([APP]);
    expect(resultado.remove).toEqual([APP_ESTILOS]);
    expect(resultado.usaTemplate).toBe(true);
    const app = porDestino(resultado).get(APP);
    expect(app).toContain("import PaginaInicio from './paginas/PaginaInicio.jsx';\nimport PaginaSobreNos from './paginas/PaginaSobreNos.jsx';");
    expect(app.indexOf('path="/"')).toBeLessThan(app.indexOf('path="/sobre-nos"'));
    expect(app).toContain('        <Route path="/sobre-nos" element={<PaginaSobreNos />} />');
    expect(app).toContain('Rotas de Projeto de Teste');
  });

  it('todo arquivo gerado é JSX válido', async () => {
    for (const arquivo of exportar(documento).arquivos) await compila(arquivo.conteudo, arquivo.destino);
  });

  it('cada nó vira o fragmento do item, com os filhos dentro e dois espaços por nível', () => {
    const conteudo = porDestino(exportar(documento)).get('src/paginas/PaginaInicio.jsx');
    const esperado = [
      '      <header className={estilos.cabecalho}>',
      '        <h1 className={estilos.titulo}>Olá</h1>',
      '      </header>',
      '      <section className={estilos.secao} data-espacamento="amplo">',
      '        <p className={estilos.texto}>Bem-vindo</p>',
      '        <button type="button" className={estilos.botao} data-variante="primario">Ação principal</button>',
      '        <article className={estilos.cartao}>',
      '          <h2 className={estilos.titulo}>Dentro</h2>',
      '        </article>',
      '      </section>',
    ].join('\n');
    expect(conteudo).toContain(esperado);
    expect(conteudo).not.toContain('\r');
  });

  it('prop ausente usa o padrão do catálogo e prop presente usa o valor do documento', () => {
    const conteudo = porDestino(exportar(documento)).get('src/paginas/PaginaInicio.jsx');
    expect(conteudo).toContain('data-variante="primario">Ação principal</button>');
    expect(conteudo).toContain('data-espacamento="amplo"');
  });

  it('página sem região gera arquivo válido com fragmento vazio', async () => {
    const conteudo = porDestino(exportar(documento)).get('src/paginas/PaginaSobreNos.jsx');
    expect(conteudo).toContain('    <>\n\n    </>');
    await compila(conteudo, 'vazia');
  });

  it('mesmo documento, mesma saída', () => {
    expect(exportar(documento)).toEqual(exportar(structuredClone(documento)));
  });

  it('sem página, não gera nada e não pede o template', () => {
    expect(exportar({ paginas: [] })).toEqual({ arquivos: [], substitui: [], remove: [], pendencias: [], usaTemplate: false });
  });
});

describe('exportarDesign, valores do usuário são dado', () => {
  it('texto com tag e chave sai neutralizado e o arquivo continua compilando', async () => {
    const resultado = exportar({ paginas: [pagina('inicio', '/', [no('t', 'titulo', { texto: '</h1><script>{alert(1)}</script>' })])] });
    const conteudo = porDestino(resultado).get('src/paginas/PaginaInicio.jsx');
    expect(conteudo).not.toContain('<script>');
    expect(conteudo).toContain('&lt;/h1&gt;&lt;script&gt;&#123;alert(1)&#125;');
    await compila(conteudo, 'injecao');
  });

  it.each(['javascript:alert(1)', '  JavaScript:alert(1)', '\tvbscript:msgbox', 'JAVASCRIPT :x'])('origem executável %j volta ao padrão e vira pendência de valor', (origem) => {
    const resultado = exportar({ paginas: [pagina('inicio', '/', [no('foto', 'imagem', { origem })])] });
    expect(porDestino(resultado).get('src/paginas/PaginaInicio.jsx')).toContain('src="/imagens/exemplo.svg"');
    expect(resultado.pendencias).toEqual([expect.objectContaining({ tipo: 'valor', item: 'inicio/foto.origem' })]);
  });

  it('endereço comum com "javascript" no meio não é pendência', () => {
    const resultado = exportar({ paginas: [pagina('inicio', '/', [no('foto', 'imagem', { origem: '/guias/javascript:basico.png' })])] });
    expect(resultado.pendencias).toEqual([]);
  });

  it('nó com tipo fora do catálogo some do arquivo, os irmãos ficam, e vira pendência de catálogo', async () => {
    const resultado = exportar({ paginas: [pagina('inicio', '/', [
      no('corpo', 'secao', {}, [no('velho', 'carrossel'), no('frase', 'texto', { conteudo: 'Fica' })]),
    ])] });
    const conteudo = porDestino(resultado).get('src/paginas/PaginaInicio.jsx');
    expect(conteudo).toContain('Fica');
    expect(conteudo).not.toContain('carrossel');
    expect(resultado.pendencias).toEqual([{ tipo: 'catalogo', item: 'inicio/velho', motivo: expect.stringContaining('carrossel') }]);
    await compila(conteudo, 'pendencia');
  });

  it('nome de página com quebra de linha não sai do comentário', async () => {
    const resultado = exportar({ paginas: [pagina('inicio', '/', [], 'Linha um\nexport const x = 1;')] });
    const conteudo = porDestino(resultado).get('src/paginas/PaginaInicio.jsx');
    expect(conteudo).toContain('// Página "Linha um export const x = 1;"');
    await compila(conteudo, 'nome');
  });

  it('dois ids que viram o mesmo arquivo sem diferenciar caixa derrubam com FORGE_CONFLICT', () => {
    expect(nomeDoComponente('a-b')).toBe('PaginaAB');
    expect(nomeDoComponente('ab')).toBe('PaginaAb');
    expect(() => exportar({ paginas: [pagina('a-b', '/x'), pagina('ab', '/y')] })).toThrow(expect.objectContaining({ codigo: 'FORGE_CONFLICT' }));
  });

  it('id que começa com número vira identificador válido', () => {
    expect(nomeDoComponente('404')).toBe('Pagina404');
  });

  it('molde ausente derruba com o nome do molde', () => {
    expect(() => exportarDesign({ documento: { paginas: [pagina('inicio', '/')] }, catalogo: CATALOGO, moldes: {}, valores: VALORES }))
      .toThrow(/pagina\.jsx/);
  });
});

describe('template studio-paginas', () => {
  it('pagina.module.css define toda classe que um fragmento usa, e só usa tokens', () => {
    const css = PAGINAS.arquivos.find((a) => a.destino === 'src/paginas/pagina.module.css').conteudo;
    const definidas = new Set([...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]));
    for (const item of CATALOGO) {
      for (const [, classe] of item.fragmento.matchAll(/estilos\.(\w+)/g)) expect(definidas.has(classe), `${item.id}: ${classe}`).toBe(true);
    }
    const tokens = fs.readFileSync(path.join(PASTA_TEMPLATES_BUILTIN, 'design-tokens/arquivos/src/styles/tokens.css'), 'utf8');
    const declaradas = new Set([...tokens.matchAll(/(--[a-z0-9-]+):/g)].map((m) => m[1]));
    for (const [, variavel] of css.matchAll(/var\((--[a-z0-9-]+)\)/g)) expect(declaradas.has(variavel), variavel).toBe(true);
  });

  it('moldes e CSS nascem white-label: sem cor literal nem marca', () => {
    const textos = [...Object.entries(PAGINAS.moldes), ...PAGINAS.arquivos.map((a) => [a.destino, a.conteudo])];
    const achados = [];
    for (const [nome, texto] of textos) {
      for (const padrao of [/#[0-9a-fA-F]{3,8}\b/, /\brgba?\(/, /\bhsla?\(/, /\bkora\b/i]) {
        if (padrao.test(texto)) achados.push(`${nome}: ${padrao}`);
      }
    }
    expect(achados).toEqual([]);
  });
});

describe('loader de moldes', () => {
  function pastaCom(montar) {
    const raiz = criarPastaTemporaria('kora-forge-moldes-');
    temporarias.push(raiz);
    const base = path.join(raiz, 'modelo');
    fs.mkdirSync(path.join(base, 'arquivos'), { recursive: true });
    fs.writeFileSync(path.join(base, 'template.json'), JSON.stringify({ id: 'modelo', versao: 1, descricao: 'x', ordem: 1 }));
    fs.writeFileSync(path.join(base, 'arquivos', 'a.txt'), 'a');
    montar(base);
    return raiz;
  }

  it('template sem moldes/ continua valendo', () => {
    expect(carregarTemplatesBuiltin(pastaCom(() => {}))[0].moldes).toEqual({});
  });

  it('lê os moldes por nome', () => {
    const pasta = pastaCom((base) => {
      fs.mkdirSync(path.join(base, 'moldes'));
      fs.writeFileSync(path.join(base, 'moldes', 'x.jsx'), '{{A}}');
    });
    expect(carregarTemplatesBuiltin(pasta)[0].moldes).toEqual({ 'x.jsx': '{{A}}' });
  });

  it('recusa moldes/ vazia', () => {
    const pasta = pastaCom((base) => fs.mkdirSync(path.join(base, 'moldes')));
    expect(() => carregarTemplatesBuiltin(pasta)).toThrow(/vazia/);
  });

  it('recusa molde que não é arquivo', () => {
    const pasta = pastaCom((base) => fs.mkdirSync(path.join(base, 'moldes', 'sub'), { recursive: true }));
    expect(() => carregarTemplatesBuiltin(pasta)).toThrow(/só aceita arquivos/);
  });
});
