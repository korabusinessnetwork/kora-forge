// Formatação de valores do painel. Português do Brasil, moeda em dólar (a API cobra em USD).
const usdGrande = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usdPequeno = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD', minimumFractionDigits: 4, maximumFractionDigits: 4 });
const inteiro = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const umaCasa = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });

// Abaixo de um dólar, duas casas escondem a diferença entre Haiku e Opus. Quatro casas mostram.
export function formatarUsd(valor) {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return null;
  return valor > 0 && valor < 1 ? usdPequeno.format(valor) : usdGrande.format(valor);
}

export function formatarInteiro(valor) {
  return inteiro.format(valor);
}

export function formatarPercentual(fracaoOuPercentual, { jaEmPercentual = false } = {}) {
  if (typeof fracaoOuPercentual !== 'number' || !Number.isFinite(fracaoOuPercentual)) return null;
  const percentual = jaEmPercentual ? fracaoOuPercentual : fracaoOuPercentual * 100;
  return `${umaCasa.format(percentual)}%`;
}

export function formatarMs(valor) {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return null;
  return valor >= 1000 ? `${umaCasa.format(valor / 1000)} s` : `${inteiro.format(valor)} ms`;
}

export function preencher(modelo, valores) {
  return modelo.replace(/\{(\w+)\}/g, (_, chave) => String(valores[chave] ?? ''));
}
