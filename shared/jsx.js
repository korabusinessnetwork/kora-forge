// Valor de prop do catálogo é dado, nunca código. Este arquivo é a fronteira entre os dois.
//
// O fragmento de cada item é template versionado, e `renderizar()` de `shared/template.js` só
// troca `{{CHAVE}}` por valor, sem avaliar nada. Isso protege o motor, mas não protege o arquivo
// gerado: um título com `</h1><script>` fecharia a tag e injetaria código no projeto do usuário.
// Por isso todo valor passa por aqui antes de virar JSX.
//
// A escolha é neutralizar em vez de recusar. "R$ 10 > R$ 5" e "a < b" são texto legítimo, e
// recusar caractere comum transformaria uma proteção em obstáculo diário (princípio nº 1).

const ENTIDADES = Object.freeze({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  // Chave é o que abre expressão em JSX. Como entidade, o React imprime o caractere.
  '{': '&#123;',
  '}': '&#125;',
});

const PERIGOSOS = /[&<>"'{}]/g;

// Texto que vai entre tags: `<h1>{{TEXTO}}</h1>`.
export function escaparValorJsx(valor) {
  return String(valor).replace(PERIGOSOS, (caractere) => ENTIDADES[caractere]);
}

// Valor que vai dentro de aspas de atributo: `alt="{{ALTERNATIVO}}"`. Mesmo conjunto, porque
// aspas e chave quebrariam o atributo do mesmo jeito que quebrariam o corpo.
export const escaparAtributoJsx = escaparValorJsx;

// Booleano e número não são texto do usuário livre: o schema já garantiu o tipo. Ainda assim
// passam por `String()` aqui, para o fragmento nunca receber `undefined` ou `[object Object]`.
export function valorParaJsx(valor) {
  if (typeof valor === 'boolean') return valor ? 'true' : 'false';
  if (typeof valor === 'number') return Number.isFinite(valor) ? String(valor) : '0';
  return escaparValorJsx(valor);
}
