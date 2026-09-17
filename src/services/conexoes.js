import { conexaoSchema, listaConexoesSchema, testeConexaoSchema } from '@shared/schemas/conexoes.js';
import { estadoCofreSchema } from '@shared/schemas/cofre.js';
import { obter, enviar, validarContrato } from './api.js';

export const obterCofre = () => validarContrato(estadoCofreSchema, obter('/vault'));
export const criarCofre = (dados) => validarContrato(estadoCofreSchema, enviar('/vault', dados));
export const destrancarCofre = (dados) => validarContrato(estadoCofreSchema, enviar('/vault/destrancar', dados));
export const listarConexoes = () => validarContrato(listaConexoesSchema, obter('/connections')).conexoes;
export const criarConexao = (dados) => validarContrato(conexaoSchema, enviar('/connections', dados));
export const testarConexao = (id) => validarContrato(testeConexaoSchema, enviar(`/connections/${id}/testar`));
