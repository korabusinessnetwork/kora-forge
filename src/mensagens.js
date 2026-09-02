// Todo texto de UI vive aqui. Interface em português, sem i18n na Fase 1, mas com as strings
// já extraídas para não pagar refatoração depois (memory/decisions.md).
export const mensagens = {
  app: {
    nome: 'KORA FORGE',
    navegacao: 'Navegação principal',
    semProjetoAtivo: 'Nenhum projeto ativo',
    versaoDesconhecida: '…',
  },
  menu: {
    inicio: 'Início',
    config: 'Configurações',
  },
  estados: {
    carregando: 'Carregando…',
    erroGenerico: 'Não deu para falar com a API local.',
    tentarDeNovo: 'Tentar de novo',
  },
  semSessao: {
    titulo: 'Abra o Forge pelo link do terminal',
    texto: 'O link impresso pelo comando abaixo carrega o token de sessão. Sem ele, o browser não consegue falar com a API local, de propósito.',
    comando: 'npm run forge',
    comandoRotulo: 'comando para subir o Forge',
  },
  inicio: {
    titulo: 'Início',
    versao: 'Versão',
    workspace: 'Workspace',
    workspaceVazio: 'Nenhum workspace configurado. É a pasta onde os projetos vão nascer.',
    configurar: 'Configurar workspace',
    cofre: 'Cofre de segredos',
    cofreAusente: 'ausente, chega na Fase 3',
    cofreTrancado: 'trancado',
    cofreDestrancado: 'destrancado',
    copiloto: 'Copiloto Claude',
    copilotoDesligado: 'desligado (padrão)',
    copilotoLigado: 'ligado',
  },
  config: {
    titulo: 'Configurações',
    salvar: 'Salvar',
    salvo: 'Configurações salvas.',
    workspace: {
      rotulo: 'Workspace',
      micro: 'Pasta raiz onde os projetos são criados. Nada é escrito fora dela.',
      placeholder: 'D:\\dev\\kora',
    },
    tema: {
      rotulo: 'Tema',
      micro: 'Aparência da ferramenta. O tema claro chega na Fase 5.',
      escuro: 'Escuro',
      claro: 'Claro',
    },
    teto: {
      rotulo: 'Teto mensal do copiloto (USD)',
      micro: 'Quando o consumo bate o teto, o copiloto desliga sozinho.',
      invalido: 'Informe um número maior ou igual a zero.',
    },
  },
  campo: {
    padrao: 'Padrão',
  },
  selecao: {
    padraoKora: 'padrão Kora',
  },
  selo: {
    rascunho: 'rascunho',
    pronto: 'pronto',
    materializado: 'materializado',
    arquivado: 'arquivado',
    ativa: 'ativa',
    invalida: 'inválida',
  },
  chave: {
    copiar: 'Copiar',
    copiado: 'Copiado',
  },
};
