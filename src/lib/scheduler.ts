import { db } from "./db";
import { createTask, startTask } from "./runner";
import { budgetBlockReason } from "./billing";

export type Recurring = {
  id: number;
  agent_id: string;
  instruction: string;
  frequency: "daily" | "weekly" | "monthly";
  weekday: number | null; // 1 = lundi … 7 = dimanche
  monthday: number | null;
  hour: number;
  enabled: number;
  last_run: string | null;
};

/** Date, heure et jour de la semaine dans le fuseau de l'entreprise. */
export function localNow(now = new Date()) {
  const tz = process.env.TIMEZONE ?? "Europe/Paris";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
      weekday: "short",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(parts.weekday) + 1;
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), weekday, monthday: Number(parts.day) };
}

export function isDue(r: Recurring, now = localNow()) {
  if (!r.enabled || r.last_run === now.date || now.hour < r.hour) return false;
  if (r.frequency === "weekly") return r.weekday === now.weekday;
  if (r.frequency === "monthly") return r.monthday === now.monthday;
  return true;
}

export function runDueTasks(now = localNow()) {
  const due = (db.prepare("SELECT * FROM recurring WHERE enabled = 1").all() as Recurring[]).filter((r) => isDue(r, now));
  if (!due.length || budgetBlockReason()) return [];
  const started: number[] = [];
  for (const r of due) {
    db.prepare("UPDATE recurring SET last_run = ? WHERE id = ?").run(now.date, r.id);
    const id = createTask(r.agent_id, `[Automatique] ${r.instruction}`);
    void startTask(id);
    started.push(id);
  }
  return started;
}

const g = globalThis as unknown as { __bureauScheduler?: NodeJS.Timeout };

/** Vérifie chaque minute s'il y a des tâches automatiques à lancer. */
export function startScheduler() {
  if (g.__bureauScheduler) return;
  g.__bureauScheduler = setInterval(() => {
    try {
      runDueTasks();
    } catch (err) {
      console.error("[automatisations]", err);
    }
  }, 60_000);
}
