// Data ISO para o formato curto pt-BR. Função pura, com teste.
const formatador = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export function formatarData(iso) {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';
  return formatador.format(data);
}
