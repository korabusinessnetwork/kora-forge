import { describe, it, expect } from 'vitest';
import { listarTokens, TOKENS_PADRAO } from '@shared/schemas/design.js';
import {
  listarCampos, listarGrupos, grupoDe, lerToken, trocarToken, restaurarGrupo,
  corParaSeletor, seletorRepresenta, variaveisDoPreview, ORDEM_DOS_GRUPOS,
} from './campos.js';

describe('descritores de campo', () => {
  it('todo token do schema tem campo, e nenhum campo é inventado', () => {
    const doSchema = listarTokens().map((t) => t.caminho).sort();
    const doPainel = listarCampos().map((c) => c.caminho).sort();
    expect(doPainel).toEqual(doSchema);
  });

  it('todo grupo do schema aparece na ordem declarada, e nenhum campo fica órfão', () => {
    const grupos = listarGrupos();
    expect(grupos.map((g) => g.grupo)).toEqual([...ORDEM_DOS_GRUPOS]);
    const somados = grupos.reduce((total, grupo) => total + grupo.campos.length, 0);
    expect(somados).toBe(listarCampos().length);
    for (const grupo of grupos) {
      expect(grupo.titulo, grupo.grupo).toBeTruthy();
      expect(grupo.micro, grupo.grupo).toBeTruthy();
    }
  });

  it('cor é editada por seletor, o resto por texto', () => {
    const porCaminho = new Map(listarCampos().map((c) => [c.caminho, c]));
    expect(porCaminho.get('cor.fundo').tipo).toBe('cor');
    expect(porCaminho.get('corEscuro.fundo').tipo).toBe('cor');
    expect(porCaminho.get('espaco[0]').tipo).toBe('texto');
    expect(porCaminho.get('fonte.ui').tipo).toBe('texto');
  });

  it('o rótulo de um token de escala é o nome do token gerado, não uma tradução', () => {
    const porCaminho = new Map(listarCampos().map((c) => [c.caminho, c]));
    expect(porCaminho.get('espaco[0]').rotulo).toBe('--espaco-1');
    expect(porCaminho.get('sombra[1]').rotulo).toBe('--sombra-2');
    expect(porCaminho.get('cor.textoSecundario').rotulo).toBe('Texto secundário');
  });

  it('cada campo carrega o valor de agora e o padrão do Forge, para o campo mostrar os dois', () => {
    const tokens = trocarToken(TOKENS_PADRAO, 'cor.acento', '#ff0055');
    const campo = listarCampos(tokens).find((c) => c.caminho === 'cor.acento');
    expect(campo.valor).toBe('#ff0055');
    expect(campo.padrao).toBe(TOKENS_PADRAO.cor.acento);
  });

  it('o id de campo é estável e serve de âncora de label', () => {
    const porCaminho = new Map(listarCampos().map((c) => [c.caminho, c]));
    expect(porCaminho.get('cor.fundo').id).toBe('token-cor-fundo');
    expect(porCaminho.get('espaco[0]').id).toBe('token-espaco-0');
    expect(new Set(listarCampos().map((c) => c.id)).size).toBe(listarCampos().length);
  });
});

describe('ler e trocar token', () => {
  it('grupoDe entende as duas formas de caminho', () => {
    expect(grupoDe('cor.fundo')).toBe('cor');
    expect(grupoDe('espaco[3]')).toBe('espaco');
  });

  it('lerToken devolve o valor de objeto e de escala', () => {
    expect(lerToken(TOKENS_PADRAO, 'cor.fundo')).toBe('#ffffff');
    expect(lerToken(TOKENS_PADRAO, 'espaco[0]')).toBe('4px');
  });

  it('trocar um token não muta o objeto que veio da API', () => {
    const antes = JSON.stringify(TOKENS_PADRAO);
    const depois = trocarToken(TOKENS_PADRAO, 'cor.fundo', '#000000');
    expect(depois.cor.fundo).toBe('#000000');
    expect(TOKENS_PADRAO.cor.fundo).toBe('#ffffff');
    expect(JSON.stringify(TOKENS_PADRAO)).toBe(antes);
  });

  it('trocar um degrau da escala mantém os outros no lugar', () => {
    const depois = trocarToken(TOKENS_PADRAO, 'espaco[2]', '99px');
    expect(depois.espaco).toEqual(['4px', '8px', '99px', '16px', '24px', '32px', '48px', '64px']);
  });

  it('restaurar um grupo volta só aquele grupo', () => {
    let tokens = trocarToken(TOKENS_PADRAO, 'cor.fundo', '#000000');
    tokens = trocarToken(tokens, 'fonte.ui', 'Comic Sans');
    const restaurado = restaurarGrupo(tokens, 'cor');
    expect(restaurado.cor.fundo).toBe('#ffffff');
    expect(restaurado.fonte.ui).toBe('Comic Sans');
  });

  it('restaurar uma escala devolve uma cópia, não a lista congelada do padrão', () => {
    const restaurado = restaurarGrupo(trocarToken(TOKENS_PADRAO, 'espaco[0]', '1px'), 'espaco');
    expect(restaurado.espaco).toEqual([...TOKENS_PADRAO.espaco]);
    expect(restaurado.espaco).not.toBe(TOKENS_PADRAO.espaco);
  });
});

describe('cor no seletor nativo', () => {
  it('hex de seis dígitos é representável, e vem normalizado em minúsculas', () => {
    expect(seletorRepresenta('#FF0055')).toBe(true);
    expect(corParaSeletor('#FF0055')).toBe('#ff0055');
    expect(corParaSeletor('  #ff0055 ')).toBe('#ff0055');
  });

  it('cor que o seletor não entende continua válida, e o seletor cai para um valor neutro', () => {
    for (const valor of ['rgb(10 10 10)', 'oklch(0.7 0.1 200)', '#fff', 'red', '']) {
      expect(seletorRepresenta(valor), valor).toBe(false);
      expect(corParaSeletor(valor), valor).toBe('#000000');
    }
  });
});

describe('variáveis do preview', () => {
  it('toda variável sai com o alias --projeto-, nenhuma com o nome cru nem com --forge-', () => {
    const estilo = variaveisDoPreview(TOKENS_PADRAO);
    const nomes = Object.keys(estilo);
    expect(nomes.length).toBeGreaterThan(30);
    for (const nome of nomes) expect(nome.startsWith('--projeto-'), nome).toBe(true);
    expect(estilo['--projeto-cor-fundo']).toBe('#ffffff');
    expect(estilo['--projeto-espaco-1']).toBe('4px');
  });

  it('o tema escuro fica de fora: ele é media query no arquivo gerado, não estado do preview', () => {
    const estilo = variaveisDoPreview(trocarToken(TOKENS_PADRAO, 'corEscuro.fundo', '#123456'));
    expect(Object.values(estilo)).not.toContain('#123456');
    expect(estilo['--projeto-cor-fundo']).toBe('#ffffff');
  });

  it('trocar um token muda a variável correspondente, que é o que faz o preview ser ao vivo', () => {
    const estilo = variaveisDoPreview(trocarToken(TOKENS_PADRAO, 'cor.acento', '#ff0055'));
    expect(estilo['--projeto-cor-acento']).toBe('#ff0055');
  });
});
