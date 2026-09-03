// Códigos de erro estáveis da API local. Contrato em docs/07_APIS/README.md.
// Cada código carrega o status HTTP e a mensagem padrão, legível por humano.
export const CODIGOS_ERRO = Object.freeze({
  FORGE_UNAUTHORIZED: { status: 401, mensagem: 'Acesso negado à API local.' },
  FORGE_VALIDATION: { status: 400, mensagem: 'Entrada fora do contrato.' },
  FORGE_NOT_FOUND: { status: 404, mensagem: 'Rota não encontrada.' },
  FORGE_PATH_FORBIDDEN: { status: 403, mensagem: 'Caminho fora do workspace.' },
  FORGE_CMD_NOT_ALLOWED: { status: 403, mensagem: 'Comando fora da whitelist.' },
  FORGE_TOOL_MISSING: { status: 409, mensagem: 'Ferramenta exigida não está instalada.' },
  FORGE_PLAN_STALE: { status: 409, mensagem: 'O blueprint mudou depois do dry-run. Refaça o plano.' },
  FORGE_CONFLICT: { status: 409, mensagem: 'Arquivo existente com conflito não resolvido.' },
  FORGE_VAULT_LOCKED: { status: 423, mensagem: 'Cofre trancado.' },
  FORGE_COPILOT_DISABLED: { status: 403, mensagem: 'Copiloto desligado.' },
  FORGE_BUDGET_EXCEEDED: { status: 402, mensagem: 'Teto de custo do copiloto atingido.' },
  FORGE_RUN_FAILED: { status: 500, mensagem: 'Comando terminou com erro.' },
  FORGE_INTERNAL: { status: 500, mensagem: 'Erro interno do Forge.' },
  FORGE_CONFIG: { status: 500, mensagem: 'Configuração inválida.' },
  FORGE_PLAN_BLOQUEADO: { status: 409, mensagem: 'Há bloqueios abertos no motor de regras.' },
  FORGE_TEMPLATE_INCOMPLETO: { status: 500, mensagem: 'Template com placeholder sem valor.' },
  FORGE_PORT_IN_USE: { status: 500, mensagem: 'A porta da API local já está em uso.' },
  // Só o cliente emite os dois abaixo. O servidor nunca os devolve.
  FORGE_OFFLINE: { status: 0, mensagem: 'A API local não respondeu.' },
  FORGE_CONTRACT: { status: 0, mensagem: 'A API local respondeu fora do contrato.' },
});

export const codigosErro = Object.freeze(Object.keys(CODIGOS_ERRO));
