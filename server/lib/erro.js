import { CODIGOS_ERRO } from '../../shared/erros.js';

// Erro de domínio do Forge: código estável, mensagem legível e detalhe estruturado.
// Falha nunca silenciada: quem captura um ErroForge sabe exatamente o que aconteceu.
export class ErroForge extends Error {
  constructor(codigo, mensagem, detalhe = {}) {
    const base = CODIGOS_ERRO[codigo];
    if (!base) throw new TypeError(`Código de erro desconhecido: ${codigo}`);
    super(mensagem ?? base.mensagem);
    this.name = 'ErroForge';
    this.codigo = codigo;
    this.status = base.status;
    this.detalhe = detalhe;
  }
}
