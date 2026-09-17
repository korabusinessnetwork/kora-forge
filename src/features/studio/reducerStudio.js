import {
  adicionarNo,
  adicionarPagina,
  encontrarNo,
  encontrarPagina,
  moverNo,
  moverPagina,
  removerNo,
  removerPagina,
  trocarCampoDaPagina,
  trocarProp,
} from './documento.js';
import { restaurarGrupo, trocarToken } from './campos.js';
import { TOKENS_PADRAO } from '@shared/schemas/design.js';
import { mensagens } from '../../mensagens.js';

// O estado do Studio inteiro em um reducer puro: documento, seleção, e as duas pilhas de desfazer
// e refazer. Puro de propósito, porque desfazer é a parte que mais quebra em editor e a única
// forma honesta de conferir isso é exercitar sequências longas sem montar componente nenhum.
//
// A regra do documento mora em `documento.js`; aqui mora quando a história ganha uma entrada e
// para onde a seleção vai depois de cada ação.

const m = mensagens.studio;

export const ESTADO_INICIAL = Object.freeze({
  documento: null,
  itens: [],
  selecao: { pagina: null, no: null },
  passado: [],
  futuro: [],
  // Marca da última edição, usada só para coalescer digitação. Ver `comHistoria`.
  marca: null,
});

// Depois de desfazer, remover ou trocar de documento, a seleção pode apontar para algo que não
// existe mais. Em vez de espalhar essa checagem pela tela, ela acontece em um lugar só.
export function selecaoValida(documento, selecao) {
  if (!documento) return { pagina: null, no: null };
  const pagina = encontrarPagina(documento, selecao?.pagina) ?? documento.paginas?.[0] ?? null;
  if (!pagina) return { pagina: null, no: null };
  if (!selecao?.no) return { pagina: pagina.id, no: null };
  const alvo = encontrarNo(documento, selecao.no);
  if (!alvo || alvo.pagina.id !== pagina.id) return { pagina: pagina.id, no: null };
  return { pagina: pagina.id, no: selecao.no };
}

function nomeDoNo(estado, idNo) {
  const alvo = encontrarNo(estado.documento, idNo);
  if (!alvo) return '';
  const item = estado.itens.find((atual) => atual.id === alvo.no.tipo);
  return item?.nome ?? alvo.no.tipo;
}

// Uma entrada de história só entra se o documento mudou de verdade. Ação que a regra recusou
// (mover para onde não cabe, por exemplo) devolve o mesmo documento, e aí não há o que desfazer:
// desfazer que não desfaz nada é pior do que não ter botão.
function comHistoria(estado, documento, rotulo, marca = null) {
  if (documento === estado.documento) return estado;
  // Coalescência por marca: digitar vinte letras no mesmo campo é um desfazer, não vinte. É por
  // caminho do campo e não por tempo, então não depende de timer e continua determinística.
  const junta = marca !== null && marca === estado.marca && estado.passado.length > 0;
  return {
    ...estado,
    documento,
    passado: junta ? estado.passado : [...estado.passado, { documento: estado.documento, rotulo }],
    // Refazer é descartado assim que uma edição nova entra, senão a história vira galho e ninguém
    // sabe mais para onde o refazer leva.
    futuro: [],
    marca,
  };
}

function comSelecao(estado, selecao) {
  return { ...estado, selecao: selecaoValida(estado.documento, selecao) };
}

export function reducerStudio(estado, acao) {
  switch (acao.tipo) {
    // --- ciclo de vida ---------------------------------------------------------------------
    case 'iniciar': {
      const base = { ...ESTADO_INICIAL, documento: acao.documento, itens: acao.itens ?? [] };
      return { ...base, selecao: selecaoValida(acao.documento, acao.selecao ?? { pagina: null, no: null }) };
    }

    case 'catalogo':
      return { ...estado, itens: acao.itens ?? [] };

    case 'selecionar':
      return comSelecao(estado, { pagina: acao.pagina, no: acao.no ?? null });

    // --- páginas ---------------------------------------------------------------------------
    case 'adicionarPagina': {
      const { documento, id } = adicionarPagina(estado.documento, acao.nome);
      const proximo = comHistoria(estado, documento, m.acoes.adicionarPagina);
      // Selecionar o que acabou de nascer: a próxima ação continua de onde a pessoa está, em vez
      // de mandá-la procurar na árvore o que ela mesma criou.
      return comSelecao(proximo, { pagina: id, no: null });
    }

    case 'removerPagina': {
      const indice = estado.documento.paginas.findIndex((pagina) => pagina.id === acao.id);
      const documento = removerPagina(estado.documento, acao.id);
      const proximo = comHistoria(estado, documento, m.acoes.removerPagina);
      const vizinha = documento.paginas[Math.max(0, indice - 1)] ?? null;
      return comSelecao(proximo, { pagina: vizinha?.id ?? null, no: null });
    }

    case 'moverPagina':
      return comHistoria(estado, moverPagina(estado.documento, acao.id, acao.direcao), m.acoes.moverPagina);

    case 'trocarCampoDaPagina':
      return comHistoria(
        estado,
        trocarCampoDaPagina(estado.documento, acao.id, acao.campo, acao.valor),
        acao.campo === 'rota' ? m.acoes.trocarRota : m.acoes.renomearPagina,
        `pagina:${acao.id}:${acao.campo}`,
      );

    // --- nós -------------------------------------------------------------------------------
    case 'adicionarNo': {
      const item = estado.itens.find((atual) => atual.id === acao.item);
      const { documento, id } = adicionarNo(estado.itens, estado.documento, estado.selecao, acao.item);
      if (!id) return estado;
      const proximo = comHistoria(estado, documento, m.acoes.adicionar(item?.nome ?? acao.item));
      return comSelecao(proximo, { pagina: estado.selecao.pagina, no: id });
    }

    case 'removerNo': {
      const rotulo = m.acoes.remover(nomeDoNo(estado, acao.id));
      const alvo = encontrarNo(estado.documento, acao.id);
      const documento = removerNo(estado.documento, acao.id);
      const proximo = comHistoria(estado, documento, rotulo);
      // A seleção sobe para o pai, ou para a página quando o nó removido era região no topo.
      return comSelecao(proximo, { pagina: alvo?.pagina.id ?? estado.selecao.pagina, no: alvo?.pai?.id ?? null });
    }

    case 'moverNo':
      return comHistoria(estado, moverNo(estado.itens, estado.documento, acao.id, acao.direcao), m.acoes.mover(nomeDoNo(estado, acao.id)));

    case 'trocarProp':
      return comHistoria(
        estado,
        trocarProp(estado.documento, acao.id, acao.prop, acao.valor),
        m.acoes.editarProp(acao.rotulo ?? acao.prop),
        `prop:${acao.id}:${acao.prop}`,
      );

    // --- tokens, que passam pela mesma história porque o documento é um só ------------------
    case 'trocarToken':
      return comHistoria(
        estado,
        { ...estado.documento, tokens: trocarToken(estado.documento.tokens, acao.caminho, acao.valor) },
        m.acoes.editarToken(m.tokens.rotulos[acao.caminho] ?? acao.caminho),
        `token:${acao.caminho}`,
      );

    case 'restaurarGrupo':
      return comHistoria(
        estado,
        { ...estado.documento, tokens: restaurarGrupo(estado.documento.tokens, acao.grupo) },
        m.acoes.restaurarGrupo(m.tokens.grupos[acao.grupo]?.titulo ?? acao.grupo),
      );

    case 'restaurarTokens':
      return comHistoria(estado, { ...estado.documento, tokens: TOKENS_PADRAO }, m.acoes.restaurarTokens);

    // --- história --------------------------------------------------------------------------
    case 'descartar':
      return comHistoria(estado, acao.documento, m.acoes.descartar);

    case 'desfazer': {
      const anterior = estado.passado.at(-1);
      if (!anterior) return estado;
      const proximo = {
        ...estado,
        documento: anterior.documento,
        passado: estado.passado.slice(0, -1),
        futuro: [...estado.futuro, { documento: estado.documento, rotulo: anterior.rotulo }],
        marca: null,
      };
      return comSelecao(proximo, estado.selecao);
    }

    case 'refazer': {
      const adiante = estado.futuro.at(-1);
      if (!adiante) return estado;
      const proximo = {
        ...estado,
        documento: adiante.documento,
        passado: [...estado.passado, { documento: estado.documento, rotulo: adiante.rotulo }],
        futuro: estado.futuro.slice(0, -1),
        marca: null,
      };
      return comSelecao(proximo, estado.selecao);
    }

    default:
      return estado;
  }
}

// O que os dois botões mostram. `null` quer dizer desabilitado, e o rótulo nomeia a ação, porque
// "desfazer" sozinho obriga a pessoa a lembrar o que ela fez (princípio nº 1).
export function rotuloDeDesfazer(estado) {
  return estado.passado.at(-1)?.rotulo ?? null;
}

export function rotuloDeRefazer(estado) {
  return estado.futuro.at(-1)?.rotulo ?? null;
}
