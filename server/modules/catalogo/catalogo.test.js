import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import { criarAppDeTeste, criarPastaTemporaria } from '../../testes/apoio.js';
import { carregarCatalogoBuiltin, conferirCoerencia, criarServicoCatalogo, PASTA_CATALOGO_BUILTIN } from './servico.js';
import { catalogoSchema, chaveDaProp, CHAVE_FILHOS, CATALOGO_VERSAO } from '../../../shared/schemas/catalogo.js';
import { chavesUsadas, renderizar } from '../../../shared/template.js';
import { valorParaJsx } from '../../../shared/jsx.js';

let contexto;
const temporarias = [];
afterEach(async () => {
  if (contexto) { await contexto.fechar(); contexto = null; }
  while (temporarias.length > 0) fs.rmSync(temporarias.pop(), { recursive: true, force: true });
});
const novo = () => { contexto = criarAppDeTeste(); return contexto; };
const get = (ctx, url) => ctx.app.inject({ method: 'GET', url, headers: ctx.cabecalhos });

// Escreve um catálogo sintético em pasta temporária, para provar que o boot falha do jeito certo.
function catalogoFalso(itens) {
  const raiz = criarPastaTemporaria('kora-forge-catalogo-');
  temporarias.push(raiz);
  for (const { id, item, fragmento } of itens) {
    const pasta = path.join(raiz, id);
    fs.mkdirSync(pasta, { recursive: true });
    if (item !== null) fs.writeFileSync(path.join(pasta, 'item.json'), typeof item === 'string' ? item : JSON.stringify(item), 'utf8');
    if (fragmento !== null) fs.writeFileSync(path.join(pasta, 'fragmento.jsx'), fragmento, 'utf8');
  }
  return raiz;
}

const itemBase = (extra = {}) => ({
  id: 'botao', versao: 1, papel: 'componente', nome: 'Botão',
  descricao: 'a ação da região', microtexto: 'vira um button no projeto',
  props: [{ id: 'texto', tipo: 'texto', rotulo: 'Texto', microtexto: 'o que o botão diz', padrao: 'Enviar', obrigatoria: true }],
  aceita: [], ...extra,
});
const FRAGMENTO_BOTAO = '<button type="button">{{TEXTO}}</button>';

const capturar = (fn) => { try { fn(); return null; } catch (erro) { return erro; } };

const CATALOGO = carregarCatalogoBuiltin();

describe('o catálogo builtin carrega e é coerente', () => {
  it('tem os nove itens da versão 1, três regiões e seis componentes', () => {
    expect(CATALOGO.map((item) => item.id)).toEqual(['botao', 'cabecalho', 'campo', 'cartao', 'imagem', 'rodape', 'secao', 'texto', 'titulo']);
    expect(CATALOGO.filter((item) => item.papel === 'regiao').map((i) => i.id)).toEqual(['cabecalho', 'rodape', 'secao']);
    expect(CATALOGO.filter((item) => item.papel === 'componente')).toHaveLength(6);
  });

  it('todo item traz nome, microtexto e fragmento, e nenhum fica sem o que a paleta precisa', () => {
    for (const item of CATALOGO) {
      expect(item.nome, item.id).toBeTruthy();
      expect(item.microtexto, item.id).toBeTruthy();
      expect(item.fragmento.trim(), item.id).not.toBe('');
    }
  });

  // A amarração que impede o Studio de desenhar o que o gerador não sabe escrever. Vale nos dois
  // sentidos, e é por isso que são duas varreduras e não uma.
  it('toda chave do fragmento é prop declarada ou a chave reservada dos filhos', () => {
    const sobrando = [];
    for (const item of CATALOGO) {
      const declaradas = new Set(item.props.map((prop) => chaveDaProp(prop.id)));
      for (const chave of chavesUsadas(item.fragmento)) {
        if (chave !== CHAVE_FILHOS && !declaradas.has(chave)) sobrando.push(`${item.id}: {{${chave}}}`);
      }
    }
    expect(sobrando).toEqual([]);
  });

  it('toda prop declarada aparece no fragmento: prop que ninguém usa é campo que não faz nada', () => {
    const orfas = [];
    for (const item of CATALOGO) {
      const chaves = new Set(chavesUsadas(item.fragmento));
      for (const prop of item.props) {
        if (!chaves.has(chaveDaProp(prop.id))) orfas.push(`${item.id}.${prop.id}`);
      }
    }
    expect(orfas).toEqual([]);
  });

  it('só quem aceita filhos usa a chave dos filhos, e quem aceita é obrigado a usar', () => {
    for (const item of CATALOGO) {
      const temChave = chavesUsadas(item.fragmento).includes(CHAVE_FILHOS);
      expect(temChave, item.id).toBe(item.aceita.length > 0);
    }
  });

  it('tudo o que um item aceita existe no catálogo', () => {
    const ids = new Set(CATALOGO.map((item) => item.id));
    const quebradas = [];
    for (const item of CATALOGO) {
      for (const filho of item.aceita) if (!ids.has(filho)) quebradas.push(`${item.id} → ${filho}`);
    }
    expect(quebradas).toEqual([]);
  });

  it('região não é aceita como filha por ninguém, e todo componente tem onde entrar', () => {
    const porId = new Map(CATALOGO.map((item) => [item.id, item]));
    const aceitos = new Set(CATALOGO.flatMap((item) => item.aceita));
    for (const id of aceitos) expect(porId.get(id).papel, id).toBe('componente');
    for (const item of CATALOGO) {
      if (item.papel === 'componente') expect(aceitos.has(item.id), item.id).toBe(true);
    }
  });

  // Todo projeto gerado nasce white-label: nenhum template pode trazer marca, cor ou nome de
  // cliente hardcodado. O fragmento é template, e vale a mesma regra.
  it('nenhum fragmento traz cor literal nem marca: o projeto gerado nasce white-label', () => {
    const achados = [];
    for (const item of CATALOGO) {
      for (const padrao of [/#[0-9a-fA-F]{3,8}\b/, /\brgba?\(/, /\bhsla?\(/, /\bkora\b/i]) {
        if (padrao.test(item.fragmento)) achados.push(`${item.id}: ${padrao}`);
      }
    }
    expect(achados).toEqual([]);
  });

  it('o fragmento renderiza com os padrões do catálogo, sem sobrar placeholder', () => {
    for (const item of CATALOGO) {
      const valores = Object.fromEntries(item.props.map((prop) => [chaveDaProp(prop.id), valorParaJsx(prop.padrao)]));
      if (item.aceita.length > 0) valores[CHAVE_FILHOS] = '';
      const saida = renderizar(item.fragmento, valores, item.id);
      expect(saida, item.id).not.toContain('{{');
    }
  });
});

describe('catálogo fora do contrato derruba o boot, e diz onde', () => {
  it('item.json que não é JSON válido', () => {
    const raiz = catalogoFalso([{ id: 'botao', item: '{ nao json', fragmento: FRAGMENTO_BOTAO }]);
    const erro = capturar(() => carregarCatalogoBuiltin(raiz));
    expect(erro.codigo).toBe('FORGE_VALIDATION');
    expect(erro.detalhe.issues[0].caminho).toBe('botao/item.json');
  });

  it('item fora do contrato, com o caminho do campo', () => {
    const raiz = catalogoFalso([{ id: 'botao', item: { ...itemBase(), papel: 'widget' }, fragmento: FRAGMENTO_BOTAO }]);
    const erro = capturar(() => carregarCatalogoBuiltin(raiz));
    expect(erro.detalhe.issues[0].caminho).toContain('botao/item.json:papel');
  });

  it('id do manifesto diferente da pasta', () => {
    const raiz = catalogoFalso([{ id: 'botao', item: { ...itemBase(), id: 'button' }, fragmento: FRAGMENTO_BOTAO }]);
    const erro = capturar(() => carregarCatalogoBuiltin(raiz));
    expect(erro.detalhe.issues[0].mensagem).toContain('button');
  });

  it('item sem fragmento', () => {
    const raiz = catalogoFalso([{ id: 'botao', item: itemBase(), fragmento: null }]);
    const erro = capturar(() => carregarCatalogoBuiltin(raiz));
    expect(erro.detalhe.issues[0].caminho).toBe('botao/fragmento.jsx');
  });

  it('fragmento com chave que não é prop nem filhos', () => {
    const raiz = catalogoFalso([{ id: 'botao', item: itemBase(), fragmento: '<button>{{ROTULO}}</button>' }]);
    const erro = capturar(() => carregarCatalogoBuiltin(raiz));
    expect(erro.detalhe.issues.map((i) => i.mensagem).join(' ')).toContain('ROTULO');
  });

  it('prop declarada que o fragmento nunca usa', () => {
    const raiz = catalogoFalso([{ id: 'botao', item: itemBase(), fragmento: '<button>fixo</button>' }]);
    const erro = capturar(() => carregarCatalogoBuiltin(raiz));
    expect(erro.detalhe.issues.map((i) => i.mensagem).join(' ')).toContain('TEXTO');
  });

  it('item que aceita filho inexistente', () => {
    const raiz = catalogoFalso([{ id: 'botao', item: { ...itemBase(), aceita: ['carrossel'] }, fragmento: `${FRAGMENTO_BOTAO}{{${CHAVE_FILHOS}}}` }]);
    const erro = capturar(() => carregarCatalogoBuiltin(raiz));
    expect(erro.detalhe.issues[0].mensagem).toContain('carrossel');
  });

  it('folha com a chave dos filhos, e container sem ela', () => {
    const folha = capturar(() => conferirCoerencia([{ ...itemBase(), props: [], fragmento: `<button>{{${CHAVE_FILHOS}}}</button>` }]));
    expect(folha.detalhe.issues[0].mensagem).toContain('é folha');

    const container = capturar(() => conferirCoerencia([
      { ...itemBase(), id: 'cartao', props: [], aceita: ['botao'], fragmento: '<article />' },
      { ...itemBase(), props: [], fragmento: '<button />' },
    ]));
    expect(container.detalhe.issues[0].mensagem).toContain('sumiria na geração');
  });
});

describe('GET /catalog', () => {
  it('devolve versão e itens no envelope, dentro do contrato', async () => {
    const ctx = novo();
    const r = await get(ctx, '/api/catalog');
    expect(r.statusCode).toBe(200);
    const { data } = r.json();
    expect(catalogoSchema.safeParse(data).success).toBe(true);
    expect(data.versao).toBe(CATALOGO_VERSAO);
    expect(data.itens).toHaveLength(9);
  });

  // A paleta do bloco 4 precisa de nome, microtexto, props e o que o item aceita. O código de
  // geração é assunto do servidor: mandá-lo ao front seria superfície a mais sem uso nenhum.
  it('não devolve o fragmento: o front não tem por que saber gerar nada', async () => {
    const ctx = novo();
    const { data } = (await get(ctx, '/api/catalog')).json();
    expect(JSON.stringify(data)).not.toContain('fragmento');
    for (const item of data.itens) expect(Object.keys(item), item.id).not.toContain('fragmento');
  });

  it('passa pelas mesmas guardas: sem token não responde', async () => {
    const ctx = novo();
    const r = await ctx.app.inject({ method: 'GET', url: '/api/catalog' });
    expect(r.statusCode).toBe(401);
  });
});

describe('serviço do catálogo', () => {
  it('a pasta builtin é a do repositório, e o serviço nasce com ela', () => {
    expect(fs.existsSync(path.join(PASTA_CATALOGO_BUILTIN, 'secao', 'item.json'))).toBe(true);
    expect(criarServicoCatalogo().listar().itens).toHaveLength(9);
  });

  it('obter devolve o item com fragmento, para o gerador do bloco 6', () => {
    const servico = criarServicoCatalogo({ itens: CATALOGO });
    expect(servico.obter('titulo').fragmento).toContain('{{TEXTO}}');
    expect(servico.obter('carrossel')).toBeNull();
  });

  it('validarDocumento recusa com código estável e caminho do nó', () => {
    const servico = criarServicoCatalogo({ itens: CATALOGO });
    const documento = { catalogo: { versao: 1 }, paginas: [{ id: 'p', nome: 'P', rota: '/', regioes: [{ id: 'n', tipo: 'carrossel', props: {}, filhos: [] }] }] };
    const erro = capturar(() => servico.validarDocumento(documento));
    expect(erro.codigo).toBe('FORGE_VALIDATION');
    expect(erro.detalhe.issues[0].caminho).toBe('paginas.0.regioes.0.tipo');
  });
});
