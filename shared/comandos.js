// Whitelist global de comandos do runner (ADR-002). Preset escolhe dentro dela, nunca amplia (C7).
export const COMANDOS_PERMITIDOS = Object.freeze(['git', 'npm', 'npx', 'node', 'supabase']);
