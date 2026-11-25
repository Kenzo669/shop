// Comptes, entreprises, sessions et invitations (base centrale data/app.db).
import Database from "better-sqlite3";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { DATA_DIR, orgDir, runAsOrg, type Tenant } from "./db";

const scrypt = promisify(crypto.scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
export const SESSION_COOKIE = "bia_session";
const SESSION_DAYS = 30;

const g = globalThis as unknown as { __appDb?: Database.Database };

function openApp() {
  const a = new Database(path.join(DATA_DIR, "app.db"));
  a.pragma("busy_timeout = 5000");
  a.pragma("journal_mode = WAL");
  a.pragma("foreign_keys = ON");
  a.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS orgs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS members (
      org_id INTEGER NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'member', -- owner | member
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (org_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      org_id INTEGER NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS invites (
      token_hash TEXT PRIMARY KEY,
      org_id INTEGER NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'member',
      created_by INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      used_at INTEGER
    );
  `);
  return a;
}

/** Ouverte à la première utilisation (pas au chargement du module : le build de Next.js charge les routes en parallèle). */
export const appDb = new Proxy({} as Database.Database, {
  get(_t, prop) {
    const d = (g.__appDb ??= openApp());
    const v = Reflect.get(d, prop, d);
    return typeof v === "function" ? v.bind(d) : v;
  },
});

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

// ------------------------------------------------------------------ Mots de passe

export async function hashPassword(pw: string) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(pw, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(pw: string, stored: string) {
  const [, salt, hash] = stored.split("$");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await scrypt(pw, Buffer.from(salt, "base64"), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

// Empreinte factice : vérifier un compte inexistant prend le même temps qu'un vrai,
// pour ne pas révéler quelles adresses ont un compte.
let dummy: Promise<string> | null = null;
export async function verifyAgainstDummy(pw: string) {
  dummy ??= hashPassword(crypto.randomBytes(16).toString("hex"));
  await verifyPassword(pw, await dummy);
  return false;
}

/** Crée un utilisateur sans entreprise (rejoint ensuite via une invitation). */
export async function createUser(input: { name: string; email: string; password: string }) {
  const r = appDb
    .prepare("INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)")
    .run(input.email.trim(), input.name.trim(), await hashPassword(input.password));
  return Number(r.lastInsertRowid);
}

export function validatePassword(pw: string) {
  if (pw.length < 10) return "Le mot de passe doit faire au moins 10 caractères.";
  return null;
}

export function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 200;
}

// Limite les tentatives de connexion (par adresse et par IP) pour freiner les attaques par force brute.
const attempts = new Map<string, { n: number; until: number }>();
export function tooManyAttempts(key: string) {
  const a = attempts.get(key);
  return !!a && a.n >= 8 && a.until > Date.now();
}
export function recordFailure(key: string) {
  const a = attempts.get(key);
  if (!a || a.until < Date.now()) attempts.set(key, { n: 1, until: Date.now() + 15 * 60_000 });
  else a.n++;
}
export function clearFailures(key: string) {
  attempts.delete(key);
}

// ------------------------------------------------------------------ Comptes et entreprises

export type User = { id: number; email: string; name: string };
export type Session = { user: User; orgId: number; orgName: string; role: "owner" | "member" };

/** Crée un compte et son entreprise ; le créateur en est propriétaire. */
export async function createAccount(input: { name: string; email: string; password: string; orgName: string }) {
  const hash = await hashPassword(input.password);
  const firstOrg = (appDb.prepare("SELECT COUNT(*) AS n FROM orgs").get() as { n: number }).n === 0;
  const tx = appDb.transaction(() => {
    const u = appDb.prepare("INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)").run(input.email.trim(), input.name.trim(), hash);
    const o = appDb.prepare("INSERT INTO orgs (name) VALUES (?)").run(input.orgName.trim());
    appDb.prepare("INSERT INTO members (org_id, user_id, role) VALUES (?, ?, 'owner')").run(o.lastInsertRowid, u.lastInsertRowid);
    return { userId: Number(u.lastInsertRowid), orgId: Number(o.lastInsertRowid) };
  });
  const ids = tx();
  if (firstOrg) migrateLegacyData(ids.orgId);
  return ids;
}

/** Version précédente (une seule entreprise) : ses données deviennent celles de la première entreprise créée. */
function migrateLegacyData(orgId: number) {
  const legacy = path.join(DATA_DIR, "bureau.db");
  if (!fs.existsSync(legacy)) return;
  const dir = orgDir(orgId);
  fs.mkdirSync(dir, { recursive: true });
  for (const f of ["bureau.db", "bureau.db-wal", "bureau.db-shm"]) {
    const from = path.join(DATA_DIR, f);
    if (fs.existsSync(from)) fs.renameSync(from, path.join(dir, f));
  }
  const files = path.join(DATA_DIR, "files");
  if (fs.existsSync(files)) fs.renameSync(files, path.join(dir, "files"));
}

export function findUserByEmail(email: string) {
  return appDb.prepare("SELECT * FROM users WHERE email = ?").get(email.trim()) as (User & { password_hash: string }) | undefined;
}

export function membershipsOf(userId: number) {
  return appDb
    .prepare("SELECT m.org_id, m.role, o.name FROM members m JOIN orgs o ON o.id = m.org_id WHERE m.user_id = ? ORDER BY m.created_at")
    .all(userId) as { org_id: number; role: "owner" | "member"; name: string }[];
}

export function listMembers(orgId: number) {
  return appDb
    .prepare("SELECT u.id, u.name, u.email, m.role, m.created_at FROM members m JOIN users u ON u.id = m.user_id WHERE m.org_id = ? ORDER BY m.created_at")
    .all(orgId) as { id: number; name: string; email: string; role: string; created_at: string }[];
}

export function removeMember(orgId: number, userId: number) {
  const owners = appDb.prepare("SELECT COUNT(*) AS n FROM members WHERE org_id = ? AND role = 'owner'").get(orgId) as { n: number };
  const target = appDb.prepare("SELECT role FROM members WHERE org_id = ? AND user_id = ?").get(orgId, userId) as { role: string } | undefined;
  if (!target) throw new Error("Membre introuvable.");
  if (target.role === "owner" && owners.n <= 1) throw new Error("Impossible de retirer le dernier propriétaire.");
  appDb.prepare("DELETE FROM members WHERE org_id = ? AND user_id = ?").run(orgId, userId);
  appDb.prepare("DELETE FROM sessions WHERE org_id = ? AND user_id = ?").run(orgId, userId);
}

export function renameOrg(orgId: number, name: string) {
  appDb.prepare("UPDATE orgs SET name = ? WHERE id = ?").run(name.trim(), orgId);
}

export function allOrgIds() {
  return (appDb.prepare("SELECT id FROM orgs").all() as { id: number }[]).map((o) => o.id);
}

// ------------------------------------------------------------------ Invitations

export function createInvite(orgId: number, createdBy: number, role: "owner" | "member" = "member") {
  const token = crypto.randomBytes(24).toString("base64url");
  appDb
    .prepare("INSERT INTO invites (token_hash, org_id, role, created_by, expires_at) VALUES (?, ?, ?, ?, ?)")
    .run(sha256(token), orgId, role, createdBy, Date.now() + 7 * 24 * 3600_000);
  return token;
}

export function readInvite(token: string) {
  return appDb
    .prepare(
      `SELECT i.org_id, i.role, o.name AS org_name FROM invites i JOIN orgs o ON o.id = i.org_id
       WHERE i.token_hash = ? AND i.used_at IS NULL AND i.expires_at > ?`,
    )
    .get(sha256(token), Date.now()) as { org_id: number; role: "owner" | "member"; org_name: string } | undefined;
}

export function acceptInvite(token: string, userId: number) {
  const inv = readInvite(token);
  if (!inv) throw new Error("Invitation invalide ou expirée.");
  appDb.prepare("UPDATE invites SET used_at = ? WHERE token_hash = ?").run(Date.now(), sha256(token));
  appDb.prepare("INSERT OR IGNORE INTO members (org_id, user_id, role) VALUES (?, ?, ?)").run(inv.org_id, userId, inv.role);
  return inv.org_id;
}

// ------------------------------------------------------------------ Sessions

export async function startSession(userId: number, orgId: number) {
  const token = crypto.randomBytes(32).toString("base64url");
  appDb.prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());
  appDb
    .prepare("INSERT INTO sessions (token_hash, user_id, org_id, expires_at) VALUES (?, ?, ?, ?)")
    .run(sha256(token), userId, orgId, Date.now() + SESSION_DAYS * 24 * 3600_000);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: (process.env.APP_URL ?? "").startsWith("https://"),
    path: "/",
    maxAge: SESSION_DAYS * 24 * 3600,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) appDb.prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
  jar.delete(SESSION_COOKIE);
}

export async function currentSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = appDb
    .prepare(
      `SELECT s.user_id, s.org_id, u.email, u.name, o.name AS org_name, m.role
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       JOIN orgs o ON o.id = s.org_id
       JOIN members m ON m.org_id = s.org_id AND m.user_id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(sha256(token), Date.now()) as
    | { user_id: number; org_id: number; email: string; name: string; org_name: string; role: "owner" | "member" }
    | undefined;
  if (!row) return null;
  return { user: { id: row.user_id, email: row.email, name: row.name }, orgId: row.org_id, orgName: row.org_name, role: row.role };
}

// ------------------------------------------------------------------ Protection des routes

/** Refuse les requêtes qui modifient des données si elles viennent d'un autre site (protection CSRF). */
async function sameOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === (h.get("x-forwarded-host") ?? h.get("host"));
  } catch {
    return false;
  }
}

/**
 * Protège une route : session obligatoire, même origine pour les modifications,
 * et exécution dans le contexte (base de données, fichiers) de l'entreprise de l'utilisateur.
 */
export function authed<A extends unknown[]>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  handler: (...args: A) => Response | Promise<Response>,
  opts: { ownerOnly?: boolean } = {},
) {
  return async (...args: A): Promise<Response> => {
    if (method !== "GET" && !(await sameOrigin())) {
      return NextResponse.json({ error: "Requête refusée (origine inconnue)." }, { status: 403 });
    }
    const s = await currentSession();
    if (!s) return NextResponse.json({ error: "Session expirée : reconnectez-vous." }, { status: 401 });
    if (opts.ownerOnly && s.role !== "owner") {
      return NextResponse.json({ error: "Réservé au propriétaire du compte entreprise." }, { status: 403 });
    }
    const tenant: Tenant = { orgId: s.orgId, userId: s.user.id, role: s.role };
    return runAsOrg(tenant, () => handler(...args));
  };
}
