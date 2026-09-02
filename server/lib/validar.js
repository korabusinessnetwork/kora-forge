import { ErroForge } from './erro.js';

export function formatarIssues(erroZod) {
  return erroZod.issues.map((issue) => ({
    caminho: issue.path.map(String).join('.'),
    mensagem: issue.message,
  }));
}

// Valida na fronteira. Dado fora do contrato é rejeitado com FORGE_VALIDATION, nunca ajustado.
export function validar(schema, dados, mensagem = 'Entrada fora do contrato.') {
  const resultado = schema.safeParse(dados);
  if (resultado.success) return resultado.data;
  throw new ErroForge('FORGE_VALIDATION', mensagem, { issues: formatarIssues(resultado.error) });
}
