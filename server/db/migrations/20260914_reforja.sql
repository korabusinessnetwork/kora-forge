-- Auto-Reforja: melhorias do próprio Forge, com o mesmo ciclo spec, build e review que ele exige
-- dos projetos que gera. Item não é apagado, é descartado, como ideia e projeto.
CREATE TABLE reforge_items (
  id            TEXT PRIMARY KEY,
  titulo        TEXT NOT NULL,
  descricao     TEXT,
  origem        TEXT NOT NULL CHECK (origem IN ('manual','diagnostico','modelo')),
  sinal         TEXT,
  estado        TEXT NOT NULL DEFAULT 'proposta'
                CHECK (estado IN ('proposta','especificada','em_construcao','em_revisao','concluida','descartada')),
  prioridade    TEXT NOT NULL DEFAULT 'media' CHECK (prioridade IN ('alta','media','baixa')),
  spec_caminho  TEXT,
  criado_em     TEXT NOT NULL,
  atualizado_em TEXT NOT NULL
);
CREATE INDEX idx_reforge_items_estado ON reforge_items(estado, prioridade);
