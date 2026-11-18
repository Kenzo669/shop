import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

export const DATA_DIR = path.resolve(process.env.DATA_DIR ?? "./data");
export const FILES_DIR = path.join(DATA_DIR, "files");

fs.mkdirSync(FILES_DIR, { recursive: true });

// Une seule connexion partagée, même après le rechargement à chaud de Next.js.
const g = globalThis as unknown as { __bureauDb?: Database.Database };

function open(): Database.Database {
  const db = new Database(path.join(DATA_DIR, "bureau.db"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id TEXT NOT NULL,
      instruction TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued', -- queued | running | done | error
      result TEXT,
      parent_task_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      finished_at TEXT
    );
    CREATE TABLE IF NOT EXISTS task_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      kind TEXT NOT NULL, -- message | tool | result | error
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS emails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      direction TEXT NOT NULL, -- in | out
      status TEXT NOT NULL,    -- received | draft | sent | failed
      from_addr TEXT,
      to_addr TEXT,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      agent_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      label TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL, -- positif = recette, négatif = dépense (TTC)
      vat_rate REAL NOT NULL DEFAULT 20,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS prospects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company TEXT NOT NULL,
      contact TEXT,
      email TEXT,
      phone TEXT,
      website TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'nouveau', -- nouveau | contacté | intéressé | client | perdu
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    -- Consommation IA : une ligne par appel au modèle.
    CREATE TABLE IF NOT EXISTS usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      agent_id TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER NOT NULL,
      output_tokens INTEGER NOT NULL,
      cache_write_tokens INTEGER NOT NULL,
      cache_read_tokens INTEGER NOT NULL,
      web_searches INTEGER NOT NULL,
      cost_usd REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number TEXT NOT NULL UNIQUE,
      client TEXT NOT NULL,
      client_email TEXT,
      client_address TEXT,
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      lines TEXT NOT NULL,        -- JSON [{label, qty, unit_price_ht, vat_rate}]
      total_ht REAL NOT NULL,
      total_vat REAL NOT NULL,
      total_ttc REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'envoyée', -- brouillon | envoyée | payée | annulée
      paid_date TEXT,
      file TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT,
      email TEXT,
      weekly_hours REAL NOT NULL DEFAULT 35,
      notes TEXT,              -- disponibilités, contraintes
      active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      date TEXT NOT NULL,      -- AAAA-MM-JJ
      start TEXT NOT NULL,     -- HH:MM
      end TEXT NOT NULL,       -- HH:MM
      label TEXT
    );
    CREATE TABLE IF NOT EXISTS leaves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'congés' -- congés | maladie | formation | autre
    );
    CREATE TABLE IF NOT EXISTS recurring (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id TEXT NOT NULL,
      instruction TEXT NOT NULL,
      frequency TEXT NOT NULL,  -- daily | weekly | monthly
      weekday INTEGER,          -- 1 = lundi … 7 = dimanche (weekly)
      monthday INTEGER,         -- 1..28 (monthly)
      hour INTEGER NOT NULL,    -- 0..23
      enabled INTEGER NOT NULL DEFAULT 1,
      last_run TEXT
    );
  `);
  // Migrations légères pour les bases créées par une version précédente.
  const emailCols = (db.prepare("PRAGMA table_info(emails)").all() as { name: string }[]).map((c) => c.name);
  if (!emailCols.includes("reply_to_gmail_id")) db.exec("ALTER TABLE emails ADD COLUMN reply_to_gmail_id TEXT");
  const taskCols = (db.prepare("PRAGMA table_info(tasks)").all() as { name: string }[]).map((c) => c.name);
  if (!taskCols.includes("cost_usd")) db.exec("ALTER TABLE tasks ADD COLUMN cost_usd REAL NOT NULL DEFAULT 0");
  if (!taskCols.includes("model")) db.exec("ALTER TABLE tasks ADD COLUMN model TEXT");
  // Une tâche "en cours" au démarrage a été interrompue par un redémarrage du serveur.
  db.prepare(
    "UPDATE tasks SET status = 'error', result = 'Interrompue (redémarrage du serveur)' WHERE status IN ('running', 'queued')",
  ).run();
  return db;
}

export const db = g.__bureauDb ?? (g.__bureauDb = open());

export type Task = {
  id: number;
  agent_id: string;
  instruction: string;
  status: "queued" | "running" | "done" | "error";
  result: string | null;
  parent_task_id: number | null;
  created_at: string;
  finished_at: string | null;
  cost_usd: number;
  model: string | null;
};

export type TaskLog = {
  id: number;
  task_id: number;
  kind: "message" | "tool" | "result" | "error";
  content: string;
  created_at: string;
};

export function addLog(taskId: number, kind: TaskLog["kind"], content: string) {
  db.prepare("INSERT INTO task_logs (task_id, kind, content) VALUES (?, ?, ?)").run(taskId, kind, content);
}

export const DEFAULT_COMPANY = `Nom : Mon Entreprise
Activité : (décrivez votre activité, vos produits ou services)
Ville / pays : France
Clients cibles : (qui sont vos clients ?)
Ton de communication : professionnel et chaleureux
Signature des mails : L'équipe Mon Entreprise`;

export function getCompanyProfile(): string {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'company'").get() as { value: string } | undefined;
  return row?.value ?? DEFAULT_COMPANY;
}

export function setCompanyProfile(value: string) {
  db.prepare(
    "INSERT INTO settings (key, value) VALUES ('company', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(value);
}

export function getSetting<T>(key: string, fallback: T): T {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

export function setSetting(key: string, value: unknown) {
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(key, JSON.stringify(value));
}
