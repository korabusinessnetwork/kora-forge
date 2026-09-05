import { catalogoSchema } from '../../../shared/schemas/catalogo.js';

export default async function rotasCatalogo(app, { catalogo }) {
  // O vocabulário do Studio. Leitura pura, sem parâmetro: é o mesmo catálogo para todo projeto,
  // e o documento guarda só a versão que usou.
  app.get('/catalog', { config: { schemaSaida: catalogoSchema } }, async () => catalogo.listar());
}
