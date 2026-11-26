import { appDb } from "./auth";
import { decrypt, encrypt } from "./crypto";

/**
 * Clé API Claude saisie dans le logiciel.
 * Uniquement dans l'application de bureau (EQUIPIA_DESKTOP=1) : une installation = une machine,
 * donc une seule clé. En hébergement partagé, la clé reste dans les variables d'environnement
 * et aucun client ne peut la changer.
 */
export const desktopMode = () => process.env.EQUIPIA_DESKTOP === "1";

let loaded = false;

function ensureTable() {
  appDb.exec("CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
}

/** Charge la clé enregistrée dans l'environnement du serveur (une seule fois). */
export function loadStoredApiKey() {
  if (loaded) return;
  loaded = true;
  if (!desktopMode() || process.env.ANTHROPIC_API_KEY) return;
  ensureTable();
  const row = appDb.prepare("SELECT value FROM app_settings WHERE key = 'anthropic_api_key'").get() as
    | { value: string }
    | undefined;
  if (!row) return;
  try {
    process.env.ANTHROPIC_API_KEY = decrypt(row.value);
  } catch {
    // clé illisible (fichier secret.key remplacé) : on redemandera la clé
  }
}

export function looksLikeApiKey(key: string) {
  return /^sk-ant-[A-Za-z0-9_-]{20,}$/.test(key);
}

export function saveApiKey(key: string) {
  ensureTable();
  appDb
    .prepare(
      "INSERT INTO app_settings (key, value) VALUES ('anthropic_api_key', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .run(encrypt(key));
  process.env.ANTHROPIC_API_KEY = key;
  loaded = true;
}
