-- KORA FORGE, schema local (SQLite)
-- Convenção: snake_case, timestamps ISO 8601 UTC em TEXT.
-- Sem tenant_id por decisão registrada em ADR-003.

PRAGMA foreign_keys = ON;

CREATE TABLE schema_migrations (
  versao      TEXT PRIMARY KEY,
  aplicada_em TEXT NOT NULL
);

CREATE TABLE settings (
  chave        TEXT PRIMARY KEY,
  valor        TEXT NOT NULL,
  atualizado_em TEXT NOT NULL
);

CREATE TABLE presets (
  id           TEXT PRIMARY KEY,
  nome         TEXT NOT NULL,
  descricao    TEXT,
  categoria    TEXT NOT NULL,
  versao       INTEGER NOT NULL DEFAULT 1,
  origem       TEXT NOT NULL CHECK (origem IN ('builtin','custom')),
  payload_json TEXT NOT NULL,
  ativo        INTEGER NOT NULL DEFAULT 1,
  criado_em    TEXT NOT NULL,
  atualizado_em TEXT NOT NULL
);

CREATE TABLE projects (
  id             TEXT PRIMARY KEY,
  nome           TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,
  preset_id      TEXT NOT NULL REFERENCES presets(id),
  preset_versao  INTEGER NOT NULL,
  caminho_disco  TEXT,
  status         TEXT NOT NULL DEFAULT 'rascunho'
                 CHECK (status IN ('rascunho','pronto_para_materializar','materializado','arquivado')),
  etapa_atual    TEXT,
  criado_em      TEXT NOT NULL,
  atualizado_em  TEXT NOT NULL
);
CREATE INDEX idx_projects_status ON projects(status);

CREATE TABLE blueprints (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  versao       INTEGER NOT NULL,
  ativo        INTEGER NOT NULL DEFAULT 0,
  payload_json TEXT NOT NULL,          -- respostas, decisões, entidades, rotas, versões de template
  criado_em    TEXT NOT NULL,
  UNIQUE (project_id, versao)
);
CREATE INDEX idx_blueprints_ativo ON blueprints(project_id, ativo);

CREATE TABLE design_documents (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  versao       INTEGER NOT NULL,
  tokens_json  TEXT NOT NULL,          -- tokens --projeto-*
  paginas_json TEXT NOT NULL,          -- páginas, regiões, componentes, hierarquia
  criado_em    TEXT NOT NULL,
  UNIQUE (project_id, versao)
);

CREATE TABLE rules (
  id           TEXT PRIMARY KEY,
  versao       INTEGER NOT NULL DEFAULT 1,
  severidade   TEXT NOT NULL CHECK (severidade IN ('info','aviso','bloqueio')),
  payload_json TEXT NOT NULL,          -- quando, efeitos, textos
  ativo        INTEGER NOT NULL DEFAULT 1,
  criado_em    TEXT NOT NULL
);

CREATE TABLE rule_hits (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  rule_id       TEXT NOT NULL REFERENCES rules(id),
  severidade    TEXT NOT NULL,
  estado        TEXT NOT NULL DEFAULT 'aberto'
                CHECK (estado IN ('aberto','resolvido','dispensado','ignorado')),
  justificativa TEXT,                  -- obrigatória quando estado = 'dispensado'
  criado_em     TEXT NOT NULL,
  atualizado_em TEXT NOT NULL
);
CREATE INDEX idx_rule_hits_projeto ON rule_hits(project_id, estado);

CREATE TABLE api_templates (
  id           TEXT PRIMARY KEY,
  provider     TEXT NOT NULL,
  nome         TEXT NOT NULL,
  versao       INTEGER NOT NULL DEFAULT 1,
  payload_json TEXT NOT NULL,          -- env vars, template de cliente, teste de conexão, docs
  criado_em    TEXT NOT NULL
);

CREATE TABLE api_connections (
  id            TEXT PRIMARY KEY,
  template_id   TEXT NOT NULL REFERENCES api_templates(id),
  alias         TEXT NOT NULL UNIQUE,  -- ex.: "supabase-pessoal". Nunca contém segredo
  escopo        TEXT,
  status        TEXT NOT NULL DEFAULT 'pendente'
                CHECK (status IN ('pendente','ativa','invalida')),
  testada_em    TEXT,
  criado_em     TEXT NOT NULL,
  atualizado_em TEXT NOT NULL
);

-- Segredo isolado. Acessível apenas pelo módulo Cofre. Nunca serializado para o front.
CREATE TABLE vault_entries (
  id            TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL REFERENCES api_connections(id) ON DELETE CASCADE,
  chave         TEXT NOT NULL,         -- nome da variável, ex.: SUPABASE_ANON_KEY
  nonce         BLOB NOT NULL,
  ciphertext    BLOB NOT NULL,
  tag           BLOB NOT NULL,
  criado_em     TEXT NOT NULL,
  UNIQUE (connection_id, chave)
);

CREATE TABLE project_connections (
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  connection_id TEXT NOT NULL REFERENCES api_connections(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, connection_id)
);

CREATE TABLE command_runs (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  comando_id   TEXT NOT NULL,          -- id do comando no preset
  cmd          TEXT NOT NULL,
  args_json    TEXT NOT NULL,
  cwd          TEXT NOT NULL,
  estado       TEXT NOT NULL DEFAULT 'rodando'
               CHECK (estado IN ('rodando','sucesso','falha','cancelado','timeout')),
  exit_code    INTEGER,
  iniciado_em  TEXT NOT NULL,
  terminado_em TEXT
);
CREATE INDEX idx_command_runs_projeto ON command_runs(project_id, iniciado_em);

CREATE TABLE command_logs (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id   TEXT NOT NULL REFERENCES command_runs(id) ON DELETE CASCADE,
  stream   TEXT NOT NULL CHECK (stream IN ('stdout','stderr')),
  linha    TEXT NOT NULL,
  ts       TEXT NOT NULL
);
CREATE INDEX idx_command_logs_run ON command_logs(run_id, id);

CREATE TABLE copilot_calls (
  id             TEXT PRIMARY KEY,
  project_id     TEXT REFERENCES projects(id) ON DELETE SET NULL,
  etapa          TEXT NOT NULL,
  modelo         TEXT NOT NULL,
  tokens_entrada INTEGER NOT NULL DEFAULT 0,
  tokens_saida   INTEGER NOT NULL DEFAULT 0,
  custo_estimado REAL NOT NULL DEFAULT 0,
  estado         TEXT NOT NULL CHECK (estado IN ('sucesso','invalido','erro','timeout')),
  criado_em      TEXT NOT NULL,
  intencao       TEXT,                 -- site | aplicacao | local | api | automacao, quando conhecida
  tokens_cache_leitura INTEGER NOT NULL DEFAULT 0,
  tokens_cache_escrita INTEGER NOT NULL DEFAULT 0,
  lote           INTEGER NOT NULL DEFAULT 0,  -- 1 quando foi pelo Batch API (50% de desconto)
  duracao_ms     INTEGER
);
CREATE INDEX idx_copilot_calls_periodo ON copilot_calls(criado_em, modelo);

-- Append-only. Nunca UPDATE, nunca DELETE.
CREATE TABLE events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  nome         TEXT NOT NULL,          -- dot.case, ex.: projeto.materializado
  project_id   TEXT REFERENCES projects(id) ON DELETE SET NULL,
  payload_json TEXT,
  ts           TEXT NOT NULL
);
CREATE INDEX idx_events_nome ON events(nome, ts);

CREATE TABLE ideas (
  id            TEXT PRIMARY KEY,
  titulo        TEXT NOT NULL,
  proximo_passo TEXT,
  origem        TEXT,                  -- etapa ou tela onde surgiu
  estado        TEXT NOT NULL DEFAULT 'aberta'
                CHECK (estado IN ('aberta','virou_projeto','descartada')),
  criado_em     TEXT NOT NULL
);
