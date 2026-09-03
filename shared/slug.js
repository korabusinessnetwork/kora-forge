// Slug de projeto (RN-01.2): minúsculo, sem acento, só [a-z0-9-], sem hífen nas pontas, até 60.
export function gerarSlug(nome) {
  return String(nome ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}
