import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { manifestoSpecSchema, manifestoSugestaoSchema } from '../../../shared/schemas/reforja.js';
import { validar } from '../../lib/validar.js';

// Templates versionados da Auto-Reforja (ADR-014). Ficam fora de `templates/` porque aquela pasta
// é o catálogo de templates de projeto que o gerador varre. Template é dado, não código (C7).
export const PASTA_TEMPLATES_REFORJA = fileURLToPath(new URL('../../../templates-reforja/', import.meta.url));

function ler(pasta, ...partes) {
  return fs.readFileSync(path.join(pasta, ...partes), 'utf8');
}

function lerManifesto(pasta, subpasta, schema) {
  return validar(schema, JSON.parse(ler(pasta, subpasta, 'manifesto.json')), `Manifesto de template inválido em ${subpasta}.`);
}

export function carregarTemplatesReforja(pasta = PASTA_TEMPLATES_REFORJA) {
  return {
    spec: {
      manifesto: lerManifesto(pasta, 'spec', manifestoSpecSchema),
      texto: ler(pasta, 'spec', 'spec.md'),
    },
    sugestao: {
      manifesto: lerManifesto(pasta, 'sugestao', manifestoSugestaoSchema),
      sistema: ler(pasta, 'sugestao', 'sistema.md'),
      usuario: ler(pasta, 'sugestao', 'usuario.md'),
    },
  };
}
