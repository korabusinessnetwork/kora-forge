import { PROFUNDIDADE_MAXIMA } from '@shared/schemas/design.js';

// O documento de design como estrutura editável. Tudo aqui é função pura: recebe o documento,
// devolve outro, e nunca escreve no que veio. Quem tem estado é o reducer; este arquivo é só a
// regra, e é por isso que ele é testável sem montar um componente sequer.
//
// Nenhuma destas funções sabe o que é React, e nenhuma delas usa sorteio ou relógio: o mesmo
// documento com a mesma ação dá sempre o mesmo resultado, inclusive nos ids que ela gera
// (princípio nº 2).

// --- ids, nomes e rotas --------------------------------------------------------------------

const SEM_ACENTO = /\p{Diacritic}/gu;

// Vira `slugSchema`: minúsculas, números e hífen. Acento sai, o resto que não serve vira hífen.
export function slugificar(texto, reserva = 'item') {
  const limpo = String(texto ?? '')
    .normalize('NFD')
    .replace(SEM_ACENTO, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return limpo || reserva;
}

function coletarIdsDoNo(no, destino) {
  destino.add(no.id);
  for (const filho of no.filhos ?? []) coletarIdsDoNo(filho, destino);
}

// Página e nó dividem o mesmo espaço de ids: `documentoDesignSchema` junta os dois e recusa
// repetido. Gerar id olhando só para os nós deixaria passar colisão com o id de uma página.
export function idsDoDocumento(documento) {
  const ids = new Set();
  for (const pagina of documento.paginas ?? []) {
    ids.add(pagina.id);
    for (const regiao of pagina.regioes ?? []) coletarIdsDoNo(regiao, ids);
  }
  return ids;
}

// `titulo`, depois `titulo-2`, depois `titulo-3`. Sufixo numérico e não sorteio, porque id
// legível é o que faz o diff do bloco 7 ser lido por gente.
export function novoId(documento, base) {
  const raiz = slugificar(base);
  const usados = idsDoDocumento(documento);
  if (!usados.has(raiz)) return raiz;
  let contador = 2;
  while (usados.has(`${raiz}-${contador}`)) contador += 1;
  return `${raiz}-${contador}`;
}

// A primeira página do projeto é a raiz. As outras derivam do nome, e ninguém digita caminho.
export function novaRota(documento, nome, idIgnorado = null) {
  const usadas = new Set((documento.paginas ?? []).filter((p) => p.id !== idIgnorado).map((p) => p.rota));
  if (!usadas.has('/')) return '/';
  const raiz = `/${slugificar(nome, 'pagina')}`;
  if (!usadas.has(raiz)) return raiz;
  let contador = 2;
  while (usadas.has(`${raiz}-${contador}`)) contador += 1;
  return `${raiz}-${contador}`;
}

// --- navegação na árvore -------------------------------------------------------------------

export function encontrarPagina(documento, idPagina) {
  return (documento.paginas ?? []).find((pagina) => pagina.id === idPagina) ?? null;
}

// Devolve o nó mais o contexto que toda edição precisa: a página, o pai (null quando é região no
// topo), a posição entre os irmãos e a profundidade, contada como `profundidadeDe` do schema
// conta, com a região no topo valendo 1.
export function encontrarNo(documento, idNo) {
  for (const pagina of documento.paginas ?? []) {
    const achado = buscarNaLista(pagina.regioes ?? [], idNo, null, 1);
    if (achado) return { ...achado, pagina };
  }
  return null;
}

function buscarNaLista(lista, idNo, pai, profundidade) {
  for (let indice = 0; indice < lista.length; indice += 1) {
    const no = lista[indice];
    if (no.id === idNo) return { no, pai, indice, profundidade, irmaos: lista };
    const achado = buscarNaLista(no.filhos ?? [], idNo, no, profundidade + 1);
    if (achado) return achado;
  }
  return null;
}

// Quantos níveis a subárvore desce a partir daqui. Serve para saber se mover algo para dentro
// estouraria o teto do documento.
export function alturaDe(no) {
  const filhos = no.filhos ?? [];
  if (filhos.length === 0) return 1;
  return 1 + Math.max(...filhos.map(alturaDe));
}

export function contarDescendentes(no) {
  return (no.filhos ?? []).reduce((total, filho) => total + 1 + contarDescendentes(filho), 0);
}

// --- reescrita imutável da árvore ----------------------------------------------------------

// Todo o resto do arquivo é escrito em cima destas três. Elas copiam o caminho que muda e
// reaproveitam o resto, então o documento nunca é mutado e a comparação por identidade continua
// valendo para quem quiser usá-la.

function mapearPaginas(documento, idPagina, transformar) {
  return {
    ...documento,
    paginas: (documento.paginas ?? []).map((pagina) => (pagina.id === idPagina ? transformar(pagina) : pagina)),
  };
}

function mapearLista(lista, idNo, transformar) {
  let mudou = false;
  const nova = [];
  for (const no of lista) {
    if (no.id === idNo) {
      const resultado = transformar(no);
      mudou = true;
      if (resultado !== null) nova.push(resultado);
      continue;
    }
    const filhos = mapearLista(no.filhos ?? [], idNo, transformar);
    if (filhos !== null) {
      mudou = true;
      nova.push({ ...no, filhos });
      continue;
    }
    nova.push(no);
  }
  return mudou ? nova : null;
}

// Insere `novo` dentro de `idPai` na posição `indice`. `idPai` null insere no topo da página.
function inserir(documento, idPagina, idPai, indice, novo) {
  return mapearPaginas(documento, idPagina, (pagina) => {
    if (idPai === null) {
      const regioes = [...(pagina.regioes ?? [])];
      regioes.splice(indice, 0, novo);
      return { ...pagina, regioes };
    }
    const regioes = mapearLista(pagina.regioes ?? [], idPai, (pai) => {
      const filhos = [...(pai.filhos ?? [])];
      filhos.splice(indice, 0, novo);
      return { ...pai, filhos };
    });
    return regioes === null ? pagina : { ...pagina, regioes };
  });
}

// --- o que o catálogo deixa entrar ---------------------------------------------------------

function itemDe(itens, tipo) {
  return itens.find((item) => item.id === tipo) ?? null;
}

function aceitaFilho(itens, no, tipo) {
  const item = itemDe(itens, no.tipo);
  // Nó pendente (tipo que saiu do catálogo) não aceita nada: não dá para saber o que ele aceitava,
  // e chutar seria deixar gravar desenho que o gerador não escreve.
  return item ? item.aceita.includes(tipo) : false;
}

// Onde um item deste tipo cairia, dada a seleção atual. `null` quer dizer "não cabe aqui", e é
// essa resposta que a paleta usa para nem oferecer o item. A regra é a mesma na paleta e na
// inserção, porque é literalmente a mesma função: não existe item que apareça na tela e a
// validação recuse.
export function destinoDe(itens, documento, selecao, tipo) {
  const item = itemDe(itens, tipo);
  if (!item || !selecao?.pagina) return null;
  const pagina = encontrarPagina(documento, selecao.pagina);
  if (!pagina) return null;

  if (item.papel === 'regiao') {
    // Região só entra no topo da página. Com algo selecionado, entra logo depois da região que
    // contém a seleção, que é onde a pessoa está olhando.
    const regioes = pagina.regioes ?? [];
    if (!selecao.no) return { idPai: null, indice: regioes.length };
    const topo = regioes.findIndex((regiao) => regiao.id === selecao.no || contemId(regiao, selecao.no));
    return { idPai: null, indice: topo === -1 ? regioes.length : topo + 1 };
  }

  // Componente precisa de um pai que o declare em `aceita`. A página nunca é esse pai.
  if (!selecao.no) return null;
  const alvo = encontrarNo(documento, selecao.no);
  if (!alvo) return null;

  if (aceitaFilho(itens, alvo.no, tipo) && alvo.profundidade + 1 <= PROFUNDIDADE_MAXIMA) {
    return { idPai: alvo.no.id, indice: (alvo.no.filhos ?? []).length };
  }
  if (alvo.pai && aceitaFilho(itens, alvo.pai, tipo)) {
    return { idPai: alvo.pai.id, indice: alvo.indice + 1 };
  }
  return null;
}

function contemId(no, id) {
  for (const filho of no.filhos ?? []) {
    if (filho.id === id || contemId(filho, id)) return true;
  }
  return false;
}

// O que a paleta mostra. Ordem do catálogo, para a paleta não dançar entre uma seleção e outra.
export function ondePodeEntrar(itens, documento, selecao) {
  return itens.filter((item) => destinoDe(itens, documento, selecao, item.id) !== null);
}

// Props do item já preenchidas com o padrão declarado. O nó nasce válido: inserir e salvar em
// seguida nunca é recusa por obrigatória ausente, e nenhuma pergunta chega sem default.
export function propsPadrao(item) {
  const props = {};
  for (const prop of item.props ?? []) props[prop.id] = prop.padrao;
  return props;
}

// --- edições de página ---------------------------------------------------------------------

export function adicionarPagina(documento, nome) {
  const id = novoId(documento, slugificar(nome, 'pagina'));
  const pagina = { id, nome, rota: novaRota(documento, nome), regioes: [] };
  return { documento: { ...documento, paginas: [...(documento.paginas ?? []), pagina] }, id };
}

export function removerPagina(documento, idPagina) {
  return { ...documento, paginas: (documento.paginas ?? []).filter((pagina) => pagina.id !== idPagina) };
}

export function trocarCampoDaPagina(documento, idPagina, campo, valor) {
  return mapearPaginas(documento, idPagina, (pagina) => ({ ...pagina, [campo]: valor }));
}

export function moverPagina(documento, idPagina, direcao) {
  const paginas = [...(documento.paginas ?? [])];
  const indice = paginas.findIndex((pagina) => pagina.id === idPagina);
  const destino = direcao === 'cima' ? indice - 1 : indice + 1;
  if (indice === -1 || destino < 0 || destino >= paginas.length) return documento;
  [paginas[indice], paginas[destino]] = [paginas[destino], paginas[indice]];
  return { ...documento, paginas };
}

// --- edições de nó ---------------------------------------------------------------------------

export function adicionarNo(itens, documento, selecao, tipo) {
  const destino = destinoDe(itens, documento, selecao, tipo);
  if (!destino) return { documento, id: null };
  const item = itemDe(itens, tipo);
  const id = novoId(documento, tipo);
  const no = { id, tipo, props: propsPadrao(item), filhos: [] };
  return { documento: inserir(documento, selecao.pagina, destino.idPai, destino.indice, no), id };
}

export function removerNo(documento, idNo) {
  const alvo = encontrarNo(documento, idNo);
  if (!alvo) return documento;
  return mapearPaginas(documento, alvo.pagina.id, (pagina) => ({
    ...pagina,
    regioes: mapearLista(pagina.regioes ?? [], idNo, () => null) ?? pagina.regioes,
  }));
}

export function trocarProp(documento, idNo, idProp, valor) {
  const alvo = encontrarNo(documento, idNo);
  if (!alvo) return documento;
  return mapearPaginas(documento, alvo.pagina.id, (pagina) => ({
    ...pagina,
    regioes: mapearLista(pagina.regioes ?? [], idNo, (no) => ({ ...no, props: { ...no.props, [idProp]: valor } })) ?? pagina.regioes,
  }));
}

// As quatro direções de movimento. Nenhuma delas é arrastar: como não há coordenada (ADR-009,
// decisão 2), mover é reordenar um array, e reordenar é o que setas fazem bem.
export const DIRECOES = Object.freeze(['cima', 'baixo', 'entrar', 'sair']);

// Movimento que produziria documento inválido é recusado aqui, e a função devolve o documento
// intacto. Prevenção de erro acima de mensagem de erro: o botão nem chega habilitado, porque a
// tela pergunta a mesma coisa por `podeMover`.
export function moverNo(itens, documento, idNo, direcao) {
  const alvo = encontrarNo(documento, idNo);
  if (!alvo) return documento;
  const { no, pai, indice, irmaos, pagina } = alvo;

  if (direcao === 'cima' || direcao === 'baixo') {
    const destino = direcao === 'cima' ? indice - 1 : indice + 1;
    if (destino < 0 || destino >= irmaos.length) return documento;
    const trocada = [...irmaos];
    [trocada[indice], trocada[destino]] = [trocada[destino], trocada[indice]];
    return substituirIrmaos(documento, pagina.id, pai, trocada);
  }

  if (direcao === 'entrar') {
    // Vira último filho do irmão de cima, se ele aceitar e se o teto permitir.
    const novoPai = irmaos[indice - 1];
    if (!novoPai || !aceitaFilho(itens, novoPai, no.tipo)) return documento;
    // O irmão de cima está na mesma profundidade do nó, então a subárvore inteira desce um
    // nível. Se isso passar do teto do documento, o movimento não acontece.
    if (alvo.profundidade + alturaDe(no) > PROFUNDIDADE_MAXIMA) return documento;
    const semONo = irmaos.filter((irmao) => irmao.id !== idNo);
    const comFilho = semONo.map((irmao) => (irmao.id === novoPai.id ? { ...irmao, filhos: [...(irmao.filhos ?? []), no] } : irmao));
    return substituirIrmaos(documento, pagina.id, pai, comFilho);
  }

  // sair: vira o irmão seguinte do pai. Só existe se houver pai, e o avô tem que aceitar o tipo.
  if (!pai) return documento;
  const contexto = encontrarNo(documento, pai.id);
  const avo = contexto.pai;
  if (avo && !aceitaFilho(itens, avo, no.tipo)) return documento;
  // Sem avô, o destino é o topo da página, que só aceita região.
  if (!avo && itemDe(itens, no.tipo)?.papel !== 'regiao') return documento;

  const semONo = { ...pai, filhos: (pai.filhos ?? []).filter((filho) => filho.id !== idNo) };
  const novosIrmaos = [...contexto.irmaos];
  novosIrmaos[contexto.indice] = semONo;
  novosIrmaos.splice(contexto.indice + 1, 0, no);
  return substituirIrmaos(documento, pagina.id, avo, novosIrmaos);
}

function substituirIrmaos(documento, idPagina, pai, lista) {
  return mapearPaginas(documento, idPagina, (pagina) => {
    if (!pai) return { ...pagina, regioes: lista };
    const regioes = mapearLista(pagina.regioes ?? [], pai.id, (atual) => ({ ...atual, filhos: lista }));
    return regioes === null ? pagina : { ...pagina, regioes };
  });
}

export function podeMover(itens, documento, idNo, direcao) {
  return moverNo(itens, documento, idNo, direcao) !== documento;
}

// --- a árvore como lista, que é o que o painel de camadas desenha ---------------------------

const LIMITE_DO_RESUMO = 40;

// O texto que identifica o nó além do nome do item: o valor da primeira prop de texto. Sem isso,
// uma página com quatro títulos vira quatro linhas iguais na árvore.
function resumoDe(no, item) {
  const prop = (item?.props ?? []).find((atual) => atual.tipo === 'texto');
  const valor = prop ? no.props?.[prop.id] : null;
  const texto = String(valor ?? '').trim();
  if (!texto) return null;
  return texto.length > LIMITE_DO_RESUMO ? `${texto.slice(0, LIMITE_DO_RESUMO)}…` : texto;
}

// Achata o documento inteiro na ordem em que a árvore é lida, que é a ordem em que as setas do
// teclado andam. Computar isto aqui deixa o componente burro: ele desenha a lista e reporta
// eventos, sem saber o que é aninhamento.
export function listarLinhas(documento, itens = []) {
  const linhas = [];
  for (const pagina of documento.paginas ?? []) {
    const regioes = pagina.regioes ?? [];
    linhas.push({
      chave: pagina.id,
      escopo: 'pagina',
      id: pagina.id,
      pagina: pagina.id,
      nivel: 1,
      nome: pagina.nome,
      resumo: pagina.rota,
      pendente: false,
      // Quantos itens vão junto se esta linha for removida. É o número que a confirmação mostra,
      // porque "remover a Seção" sem dizer o que vai junto é ação destrutiva sem aviso.
      dentro: regioes.reduce((total, regiao) => total + 1 + contarDescendentes(regiao), 0),
    });
    empilhar(regioes, pagina.id, 2, itens, linhas);
  }
  return linhas;
}

function empilhar(lista, idPagina, nivel, itens, linhas) {
  for (const no of lista) {
    const item = itemDe(itens, no.tipo);
    linhas.push({
      chave: no.id,
      escopo: 'no',
      id: no.id,
      pagina: idPagina,
      nivel,
      nome: item?.nome ?? no.tipo,
      resumo: resumoDe(no, item),
      pendente: item === null,
      dentro: contarDescendentes(no),
    });
    empilhar(no.filhos ?? [], idPagina, nivel + 1, itens, linhas);
  }
}
