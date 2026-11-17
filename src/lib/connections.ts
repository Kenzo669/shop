import { db } from "./db";
import { decrypt, encrypt } from "./crypto";

export type Provider = "google";

export type Connection = {
  id: number;
  provider: Provider;
  account_email: string;
  scopes: string;
  expires_at: number; // ms
  created_at: string;
};

type Row = Connection & { access_token: string; refresh_token: string | null };

db.exec(`
  CREATE TABLE IF NOT EXISTS connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL,
    account_email TEXT NOT NULL,
    access_token TEXT NOT NULL,   -- chiffré
    refresh_token TEXT,           -- chiffré
    scopes TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(provider, account_email)
  );
`);

export function listConnections(): Connection[] {
  return db
    .prepare("SELECT id, provider, account_email, scopes, expires_at, created_at FROM connections ORDER BY id")
    .all() as Connection[];
}

export function getConnection(provider: Provider): (Connection & { accessToken: string; refreshToken: string | null }) | null {
  const row = db.prepare("SELECT * FROM connections WHERE provider = ? ORDER BY id LIMIT 1").get(provider) as Row | undefined;
  if (!row) return null;
  return {
    ...row,
    accessToken: decrypt(row.access_token),
    refreshToken: row.refresh_token ? decrypt(row.refresh_token) : null,
  };
}

export function saveConnection(c: {
  provider: Provider;
  accountEmail: string;
  accessToken: string;
  refreshToken: string | null;
  scopes: string;
  expiresAt: number;
}) {
  db.prepare(
    `INSERT INTO connections (provider, account_email, access_token, refresh_token, scopes, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(provider, account_email) DO UPDATE SET
       access_token = excluded.access_token,
       refresh_token = COALESCE(excluded.refresh_token, connections.refresh_token),
       scopes = excluded.scopes,
       expires_at = excluded.expires_at`,
  ).run(
    c.provider,
    c.accountEmail,
    encrypt(c.accessToken),
    c.refreshToken ? encrypt(c.refreshToken) : null,
    c.scopes,
    c.expiresAt,
  );
}

export function updateAccessToken(id: number, accessToken: string, expiresAt: number) {
  db.prepare("UPDATE connections SET access_token = ?, expires_at = ? WHERE id = ?").run(encrypt(accessToken), expiresAt, id);
}

export function deleteConnection(id: number) {
  const row = db.prepare("SELECT * FROM connections WHERE id = ?").get(id) as Row | undefined;
  db.prepare("DELETE FROM connections WHERE id = ?").run(id);
  if (!row) return null;
  return {
    ...row,
    accessToken: decrypt(row.access_token),
    refreshToken: row.refresh_token ? decrypt(row.refresh_token) : null,
  };
}
