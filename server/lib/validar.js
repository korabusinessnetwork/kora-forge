import { ErroForge } from './erro.js';

const juntar = (partes) => partes.map(String).join('.');

// Campo desconhecido no Zod vem com o caminho do objeto, e o nome do campo só dentro da mensagem
// em inglês. Aqui ele vira uma issue por campo, com caminho completo e mensagem legível, porque
// erro que não diz qual campo é obriga o usuário a adivinhar.
export function formatarIssues(erroZod) {
  return erroZod.issues.flatMap((issue) => {
    if (issue.code === 'unrecognized_keys') {
      return issue.keys.map((chave) => ({
        caminho: juntar([...issue.path, chave]),
        mensagem: 'campo desconhecido: o contrato é estrito e não aceita campo a mais.',
      }));
    }
    return [{ caminho: juntar(issue.path), mensagem: issue.message }];
  });
}

// Valida na fronteira. Dado fora do contrato é rejeitado com FORGE_VALIDATION, nunca ajustado.
export function validar(schema, dados, mensagem = 'Entrada fora do contrato.') {
  const resultado = schema.safeParse(dados);
  if (resultado.success) return resultado.data;
  throw new ErroForge('FORGE_VALIDATION', mensagem, { issues: formatarIssues(resultado.error) });
}
