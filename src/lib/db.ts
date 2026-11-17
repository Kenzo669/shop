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
  `);
  // Migrations légères pour les bases créées par une version précédente.
  const emailCols = (db.prepare("PRAGMA table_info(emails)").all() as { name: string }[]).map((c) => c.name);
  if (!emailCols.includes("reply_to_gmail_id")) db.exec("ALTER TABLE emails ADD COLUMN reply_to_gmail_id TEXT");
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
