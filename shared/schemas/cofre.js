import { z } from 'zod';

export const estadoCofreSchema = z.strictObject({ estado: z.enum(['ausente', 'trancado', 'destrancado']) });
export const criarCofreSchema = z.strictObject({ senha: z.string().min(12, 'Use ao menos 12 caracteres.'), confirmacao: z.string() }).refine((dados) => dados.senha === dados.confirmacao, { path: ['confirmacao'], message: 'As senhas não coincidem.' });
export const destrancarCofreSchema = z.strictObject({ senha: z.string().min(1) });
