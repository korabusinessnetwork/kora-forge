import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { montarValores, CHAVES_DE_VALOR, A_DEFINIR, pastaDeDados } from './valores.js';
import { chavesUsadas } from './template.js';
import { montarContexto } from './contexto.js';

const PASTA_TEMPLATES = fileURLToPath(new URL('../templates/', import.meta.url));

const preset = { id: 'criar-aplicacao-web', nome: 'Criar Aplicação Web', versao: 1, categoria: 'aplicacao', etapas: ['identidade'], defaults: { tem_ui: true } };
const projeto = { id: 'p1', nome: 'Café da Manhã', slug: 'cafe-da-manha', status: 'rascunho', caminhoDisco: null };
const opcoes = { data: '2026-09-03', projeto, preset };

function valoresDe(respostas = {}) {
  return montarValores(montarContexto({ projeto, preset, blueprint: { payload: { respostas } } }), opcoes);
}

function arquivosDeTemplate() {
  const saida = [];
  const caminhar = (raiz, prefixo = '') => {
    for (const entrada of fs.readdirSync(path.join(raiz, prefixo), { withFileTypes: true })) {
      const relativo = prefixo ? path.join(prefixo, entrada.name) : entrada.name;
      if (entrada.isDirectory()) caminhar(raiz, relativo);
      else saida.push({ caminho: relativo, conteudo: fs.readFileSync(path.join(raiz, relativo), 'utf8') });
    }
  };
  for (const id of fs.readdirSync(PASTA_TEMPLATES, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)) {
    const base = path.join(PASTA_TEMPLATES, id, 'arquivos');
    const antes = saida.length;
    caminhar(base);
    for (let i = antes; i < saida.length; i += 1) saida[i].template = id;
  }
  return saida;
}

describe('montarValores', () => {
  it('resposta em branco vira um texto honesto e visível, nunca vazio silencioso', () => {
    const valores = valoresDe();
    expect(valores.ESSENCIA).toBe(A_DEFINIR);
    expect(valores.PROBLEMA).toBe(A_DEFINIR);
    expect(valores.PERSONAS).toBe(A_DEFINIR);
    for (const chave of CHAVES_DE_VALOR) expect(typeof valores[chave], chave).toBe('string');
  });

  it('lista vira lista markdown e booleano vira Sim ou Não', () => {
    const valores = valoresDe({
      escopo: { publico: 'devs', personas: ['dono', ' dev ', ''], ahaMoment: 'ver rodar', naoObjetivos: [] },
      arquitetura: { modelo: 'A', stack: ['react', 'vite'], multiTenant: true, whiteLabel: false, auth: true, deploy: 'vercel' },
      seguranca: { dadoPessoal: true, dadoFinanceiro: false, compliance: ['LGPD'], tierGratuito: true, observacoes: '' },
    });
    expect(valores.PERSONAS).toBe('- dono\n- dev');
    expect(valores.NAO_OBJETIVOS).toBe(A_DEFINIR);
    expect(valores.STACK).toBe('- react\n- vite');
    expect(valores.STACK_LINHA).toBe('react, vite');
    expect(valores.MULTI_TENANT).toBe('Sim');
    expect(valores.WHITE_LABEL).toBe('Não');
    expect(valores.DADO_PESSOAL).toBe('Sim');
    expect(valores.COMPLIANCE).toBe('LGPD');
  });

  it('entidades viram linhas de tabela markdown, e sem entidade a tabela diz que falta definir', () => {
    const comEntidades = valoresDe({ dados: { entidades: [{ nome: 'pedido', descricao: 'Um pedido.', campos: ['valor_total', ''] }, { nome: '  ' }] } });
    expect(comEntidades.ENTIDADES).toBe('| `pedido` | Um pedido. | `valor_total` |');
    expect(valoresDe().ENTIDADES).toContain(A_DEFINIR);
  });

  it('a pasta de dados vem do modelo, não de condicional dentro do template', () => {
    expect(pastaDeDados('A')).toBe('supabase');
    expect(pastaDeDados('B')).toBe('server');
    expect(valoresDe({ arquitetura: { modelo: 'B' } }).PASTA_DADOS).toBe('server');
    expect(valoresDe({ arquitetura: { modelo: 'B' } }).MODELO_DESCRICAO).toContain('API própria');
  });

  it('a data vem do plano, não do relógio: mesma entrada, mesmo valor', () => {
    expect(valoresDe().DATA).toBe('2026-09-03');
    expect(montarValores(montarContexto({ projeto, preset, blueprint: { payload: {} } }), opcoes)).toEqual(valoresDe());
  });

  it('nome com acento é preservado, e o slug já vem seguro', () => {
    expect(valoresDe().PROJETO).toBe('Café da Manhã');
    expect(valoresDe().SLUG).toBe('cafe-da-manha');
  });
});

describe('templates contra o mapa de valores', () => {
  it('toda chave usada por qualquer template tem valor no mapa', () => {
    const arquivos = arquivosDeTemplate();
    expect(arquivos.length).toBeGreaterThan(30);
    const semValor = [];
    for (const arquivo of arquivos) {
      for (const chave of chavesUsadas(arquivo.conteudo)) {
        if (!CHAVES_DE_VALOR.includes(chave)) semValor.push(`${arquivo.template}/${arquivo.caminho}: {{${chave}}}`);
      }
    }
    expect(semValor).toEqual([]);
  });

  it('nenhum template usa uma chave que o mapa não conheça, nem o mapa fica cheio de chave morta', () => {
    const usadas = new Set(arquivosDeTemplate().flatMap((arquivo) => chavesUsadas(arquivo.conteudo)));
    const orfas = CHAVES_DE_VALOR.filter((chave) => !usadas.has(chave));
    expect(orfas, `chaves no mapa que nenhum template usa: ${orfas.join(', ')}`).toEqual([]);
  });
});
