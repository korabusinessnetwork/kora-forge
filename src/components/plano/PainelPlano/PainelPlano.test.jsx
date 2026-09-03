import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PainelPlano, { agruparPorPasta } from './PainelPlano.jsx';
import { mensagens } from '../../../mensagens.js';

const m = mensagens.plano;
const arquivo = (caminho, acao = 'criar', extra = {}) => ({ caminho, acao, tamanho: 1024, tamanhoAtual: acao === 'criar' ? null : 512, template: 'fundacao-kora', conteudo: 'x', ...extra });

const plano = (extra = {}) => ({
  hashBlueprint: `sha256:${'a'.repeat(64)}`,
  raiz: '/dev/kora/site-da-kora',
  arquivos: [arquivo('CLAUDE.md'), arquivo('memory/bugs.md'), arquivo('memory/identity.md')],
  comandos: [
    { id: 'git-init', cmd: 'git', args: ['init'], obrigatorio: true, longaDuracao: false, timeoutMs: 600000 },
    { id: 'dev', cmd: 'npm', args: ['run', 'dev'], obrigatorio: false, longaDuracao: true, timeoutMs: 600000 },
  ],
  pendencias: [],
  totais: { arquivos: 3, bytes: 3072, conflitos: 0, pulados: 0 },
  ...extra,
});

describe('agruparPorPasta', () => {
  it('agrupa preservando a ordem de chegada', () => {
    expect(agruparPorPasta([arquivo('CLAUDE.md'), arquivo('memory/a.md'), arquivo('memory/b.md')]).map(([pasta, itens]) => [pasta, itens.length]))
      .toEqual([['.', 1], ['memory', 2]]);
  });
});

describe('PainelPlano', () => {
  it('mostra resumo, raiz, e diz que nada foi escrito', () => {
    render(<PainelPlano plano={plano()} />);
    expect(screen.getByText(m.resumo(3, '3.0 kB', 2))).toBeInTheDocument();
    expect(screen.getByText('/dev/kora/site-da-kora')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(m.nadaEscrito);
  });

  it('agrupa por pasta e mostra os comandos com obrigatório e longa duração', () => {
    render(<PainelPlano plano={plano()} />);
    expect(screen.getByText('raiz do projeto')).toBeInTheDocument();
    expect(screen.getByText('memory/')).toBeInTheDocument();
    expect(screen.getByText('git init')).toBeInTheDocument();
    expect(screen.getByText('npm run dev')).toBeInTheDocument();
    expect(screen.getByText(m.longaDuracao)).toBeInTheDocument();
  });

  it('sem conflito e sem pendência as seções não aparecem', () => {
    render(<PainelPlano plano={plano()} />);
    expect(screen.queryByText(m.conflitoExplicacao)).toBeNull();
    expect(screen.queryByText(m.pendencias(1))).toBeNull();
  });

  it('conflitos aparecem no topo, antes da lista de arquivos', () => {
    const comConflito = plano({
      arquivos: [arquivo('CLAUDE.md'), arquivo('.gitignore', 'sobrescrever')],
      totais: { arquivos: 2, bytes: 2048, conflitos: 1, pulados: 0 },
    });
    render(<PainelPlano plano={comConflito} />);
    const secaoConflitos = screen.getByText(m.conflitos(1));
    const secaoArquivos = screen.getByText(m.arquivos);
    expect(secaoConflitos.compareDocumentPosition(secaoArquivos) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(m.conflitoExplicacao)).toBeInTheDocument();
    expect(screen.getAllByText('.gitignore')).toHaveLength(2);
  });

  it('pendências aparecem com o motivo, em vez de sumirem', () => {
    render(<PainelPlano plano={plano({ pendencias: [{ tipo: 'template', item: 'seo-base', motivo: 'Ainda não existe no catálogo do Forge.' }] })} />);
    expect(screen.getByText(m.pendencias(1))).toBeInTheDocument();
    expect(screen.getByText('seo-base')).toBeInTheDocument();
    expect(screen.getByText(/Ainda não existe no catálogo/)).toBeInTheDocument();
  });
});
