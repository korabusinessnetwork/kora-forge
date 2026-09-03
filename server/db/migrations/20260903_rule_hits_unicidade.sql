-- 20260903_rule_hits_unicidade
-- Um hit por regra por projeto. Sem isso, cada reavaliação duplicaria o registro e o
-- histórico de rule_hits viraria ruído em vez de auditoria.

CREATE UNIQUE INDEX idx_rule_hits_unico ON rule_hits(project_id, rule_id);
