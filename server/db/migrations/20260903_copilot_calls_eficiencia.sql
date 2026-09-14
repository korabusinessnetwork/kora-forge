-- Eficiência do copiloto: intenção da aplicação, medidores de cache, lote e latência por chamada.
-- Custo por tarefa concluída precisa dos quatro medidores da API, não só entrada e saída.
ALTER TABLE copilot_calls ADD COLUMN intencao TEXT;
ALTER TABLE copilot_calls ADD COLUMN tokens_cache_leitura INTEGER NOT NULL DEFAULT 0;
ALTER TABLE copilot_calls ADD COLUMN tokens_cache_escrita INTEGER NOT NULL DEFAULT 0;
ALTER TABLE copilot_calls ADD COLUMN lote INTEGER NOT NULL DEFAULT 0;
ALTER TABLE copilot_calls ADD COLUMN duracao_ms INTEGER;
CREATE INDEX idx_copilot_calls_periodo ON copilot_calls(criado_em, modelo);
