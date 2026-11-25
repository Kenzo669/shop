import { db, getSetting, setSetting } from "./db";
export { getSetting };
import { AGENTS } from "./agents";

// Modèles proposés, avec leurs tarifs API en dollars par million de tokens.
// Écriture en cache = 1,25 × le prix d'entrée (cache de 5 minutes).
export const MODELS = {
  "claude-opus-5-5": { label: "Opus 5.5 — le plus capable", input: 4, output: 20, cacheRead: 0.2 },
  "claude-sonnet-5-5": { label: "Sonnet 5.5 — équilibré", input: 2, output: 10, cacheRead: 0.1 },
  // Haiku : tarif pour un prompt ≤ 100 000 tokens (0,50 / 2,50 au-delà). Lecture du cache estimée à 0,1 × l'entrée.
  "claude-haiku-5-5": { label: "Haiku 5.5 — rapide et économique", input: 0.1, output: 0.5, cacheRead: 0.01 },
} as const;

export type ModelId = keyof typeof MODELS;
export const DEFAULT_MODEL: ModelId = "claude-opus-5-5";
const WEB_SEARCH_USD = 10 / 1000; // 10 $ pour 1 000 recherches web

export type AgentAiSettings = { model: ModelId; effort: "low" | "medium" | "high" };

export function isModelId(m: string): m is ModelId {
  return m in MODELS;
}

export function getAgentSettings(): Record<string, AgentAiSettings> {
  const saved = getSetting<Record<string, Partial<AgentAiSettings>>>("agent_ai", {});
  const envModel = process.env.CLAUDE_MODEL;
  const fallback: ModelId = envModel && isModelId(envModel) ? envModel : DEFAULT_MODEL;
  return Object.fromEntries(
    AGENTS.map((a) => {
      const s = saved[a.id] ?? {};
      return [
        a.id,
        {
          model: s.model && isModelId(s.model) ? s.model : fallback,
          effort: s.effort === "low" || s.effort === "high" ? s.effort : "medium",
        },
      ];
    }),
  );
}

/** Modèle et réflexion de l'assistant conseil (chat). */
export function getAssistantSettings(): AgentAiSettings {
  const s = getSetting<Partial<AgentAiSettings>>("assistant_ai", {});
  return {
    model: s.model && isModelId(s.model) ? s.model : DEFAULT_MODEL,
    effort: s.effort === "low" || s.effort === "high" ? s.effort : "medium",
  };
}

export function setAssistantSettings(v: AgentAiSettings) {
  setSetting("assistant_ai", v);
}

export function setAgentSettings(value: Record<string, AgentAiSettings>) {
  setSetting("agent_ai", value);
}

/** Budget IA mensuel en dollars (0 = pas de plafond). */
export function getBudget(): number {
  return getSetting<number>("monthly_budget_usd", 0);
}

export function setBudget(usd: number) {
  setSetting("monthly_budget_usd", Math.max(0, usd));
}

export type UsageLike = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  server_tool_use?: { web_search_requests?: number | null } | null;
};

export function costOf(model: string, u: UsageLike): number {
  const p = isModelId(model) ? MODELS[model] : MODELS[DEFAULT_MODEL];
  const write = u.cache_creation_input_tokens ?? 0;
  const read = u.cache_read_input_tokens ?? 0;
  const searches = u.server_tool_use?.web_search_requests ?? 0;
  return (
    (u.input_tokens * p.input + write * p.input * 1.25 + read * p.cacheRead + u.output_tokens * p.output) / 1_000_000 +
    searches * WEB_SEARCH_USD
  );
}

/** Enregistre la consommation d'un appel au modèle et la reporte sur la tâche. */
export function recordUsage(taskId: number, agentId: string, model: string, u: UsageLike): number {
  const cost = costOf(model, u);
  db.prepare(
    `INSERT INTO usage (task_id, agent_id, model, input_tokens, output_tokens, cache_write_tokens, cache_read_tokens, web_searches, cost_usd)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    taskId,
    agentId,
    model,
    u.input_tokens,
    u.output_tokens,
    u.cache_creation_input_tokens ?? 0,
    u.cache_read_input_tokens ?? 0,
    u.server_tool_use?.web_search_requests ?? 0,
    cost,
  );
  db.prepare("UPDATE tasks SET cost_usd = cost_usd + ? WHERE id = ?").run(cost, taskId);
  return cost;
}

export function monthSpend(): number {
  const row = db
    .prepare("SELECT COALESCE(SUM(cost_usd), 0) AS total FROM usage WHERE created_at >= date('now', 'start of month')")
    .get() as { total: number };
  return row.total;
}

/** null si on peut lancer une tâche, sinon la raison du blocage. */
export function budgetBlockReason(): string | null {
  const budget = getBudget();
  if (!budget) return null;
  const spent = monthSpend();
  if (spent >= budget) {
    return `Budget IA du mois atteint (${spent.toFixed(2)} $ sur ${budget.toFixed(2)} $). Augmentez-le dans « Consommation » pour continuer.`;
  }
  return null;
}

export function usageReport() {
  const month = "created_at >= date('now', 'start of month')";
  const totals = db
    .prepare(
      `SELECT COALESCE(SUM(cost_usd),0) AS cost, COALESCE(SUM(input_tokens),0) AS input, COALESCE(SUM(output_tokens),0) AS output,
              COALESCE(SUM(cache_read_tokens),0) AS cache_read, COALESCE(SUM(cache_write_tokens),0) AS cache_write,
              COALESCE(SUM(web_searches),0) AS searches, COUNT(DISTINCT task_id) AS tasks
       FROM usage WHERE ${month}`,
    )
    .get();
  const byAgent = db
    .prepare(
      `SELECT agent_id, SUM(cost_usd) AS cost, COUNT(DISTINCT task_id) AS tasks FROM usage WHERE ${month} GROUP BY agent_id ORDER BY cost DESC`,
    )
    .all();
  const byModel = db
    .prepare(`SELECT model, SUM(cost_usd) AS cost FROM usage WHERE ${month} GROUP BY model ORDER BY cost DESC`)
    .all();
  const byDay = db
    .prepare(
      `SELECT date(created_at) AS day, SUM(cost_usd) AS cost FROM usage WHERE created_at >= date('now', '-29 days') GROUP BY day ORDER BY day`,
    )
    .all();
  const topTasks = db
    .prepare(
      `SELECT id, agent_id, instruction, cost_usd, model FROM tasks WHERE created_at >= date('now', 'start of month') ORDER BY cost_usd DESC LIMIT 8`,
    )
    .all();
  return { totals, byAgent, byModel, byDay, topTasks, budget: getBudget(), agents: getAgentSettings(), assistant: getAssistantSettings() };
}
