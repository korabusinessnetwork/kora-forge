# Presets

Os menus do Forge. Preset é dado, nunca código (**ADR-007**, padrão P-01).

| Arquivo | Menu | Fase |
|---|---|---|
| `criar-site.json` | Criar Site | 1 |
| `criar-aplicacao-web.json` | Criar Aplicação Web | 1, preset de referência |
| `criar-aplicacao-local.json` | Criar Aplicação Local | 1 |

Contrato completo em `docs/03_REGRAS_DE_NEGOCIO/presets.md`.
Preset custom do usuário vive em `~/.kora-forge/presets/` e passa pelo mesmo schema e
pelos mesmos limites de whitelist de comando (restrição S-06).
