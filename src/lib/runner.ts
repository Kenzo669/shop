import Anthropic from "@anthropic-ai/sdk";
import { addLog, db, getCompanyProfile, type Task } from "./db";
import { AGENT_BY_ID, type AgentDef } from "./agents";
import { buildTools } from "./tools";
import { listConnections } from "./connections";
import { budgetBlockReason, getAgentSettings, getSetting, recordUsage } from "./billing";
const MAX_DELEGATION_DEPTH = 2;

let client: Anthropic | null = null;
function getClient() {
  return (client ??= new Anthropic());
}

export function aiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

function systemPrompt(agent: AgentDef) {
  return `Tu es ${agent.name}, ${agent.role}, un agent IA qui travaille dans le bureau virtuel d'une entreprise.

${agent.mission}

Profil de l'entreprise :
${getCompanyProfile()}

Comptes connectés au logiciel : ${connectedAccounts()}

Règles :
- Tu agis vraiment avec tes outils : enregistre les résultats (fichiers, brouillons, écritures, prospects) au lieu de seulement les décrire.
- Réponds en français, de façon concise.
- Quand tu as terminé, donne un compte rendu court : ce que tu as fait, où trouver les résultats, et ce qui reste à valider par un humain.
- Si une information indispensable manque, fais une hypothèse raisonnable, signale-la dans le compte rendu et continue.`;
}

function connectedAccounts() {
  const list = listConnections().map((c) => (c.provider === "google" ? `Google (Gmail et Agenda) : ${c.account_email}` : c.provider));
  return list.length ? list.join(" ; ") : "aucun (pas d'accès à une vraie boîte mail ni à un agenda)";
}

/** Crée une tâche et la lance en arrière-plan. Renvoie son identifiant. */
export function createTask(agentId: string, instruction: string, parentTaskId: number | null = null): number {
  if (!AGENT_BY_ID[agentId]) throw new Error(`Agent inconnu : ${agentId}`);
  const r = db
    .prepare("INSERT INTO tasks (agent_id, instruction, parent_task_id) VALUES (?, ?, ?)")
    .run(agentId, instruction, parentTaskId);
  return Number(r.lastInsertRowid);
}

export function startTask(taskId: number, depth = 0): Promise<string> {
  return runTask(taskId, depth).catch((err) => {
    const msg = err instanceof Error ? err.message : String(err);
    finish(taskId, "error", msg);
    return `Erreur : ${msg}`;
  });
}

function finish(taskId: number, status: "done" | "error", result: string) {
  db.prepare("UPDATE tasks SET status = ?, result = ?, finished_at = datetime('now') WHERE id = ?").run(
    status,
    result,
    taskId,
  );
  addLog(taskId, status === "done" ? "result" : "error", result);
}

async function runTask(taskId: number, depth: number): Promise<string> {
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as Task;
  const agent = AGENT_BY_ID[task.agent_id];
  db.prepare("UPDATE tasks SET status = 'running' WHERE id = ?").run(taskId);

  if (!aiConfigured()) {
    const msg = "Clé API Claude absente : ajoutez ANTHROPIC_API_KEY dans le fichier .env.local puis relancez le serveur.";
    finish(taskId, "error", msg);
    return msg;
  }
  const blocked = budgetBlockReason();
  if (blocked) {
    finish(taskId, "error", blocked);
    return blocked;
  }

  const { model, effort } = getAgentSettings()[agent.id];
  const taskCap = getSetting<number>("task_cap_usd", 3);
  db.prepare("UPDATE tasks SET model = ? WHERE id = ?").run(model, taskId);
  // Haiku n'a pas de modèle de secours côté serveur en cas de refus.
  const fallback =
    model === "claude-haiku-5-5"
      ? {}
      : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };

  const delegate = async (agentId: string, instruction: string) => {
    if (depth >= MAX_DELEGATION_DEPTH) return "Délégation refusée : trop de niveaux de sous-tâches.";
    const childId = createTask(agentId, instruction, taskId);
    addLog(taskId, "message", `→ Tâche n°${childId} confiée à ${AGENT_BY_ID[agentId].name}`);
    return startTask(childId, depth + 1);
  };

  const runner = getClient().beta.messages.toolRunner({
    model,
    max_tokens: 16000,
    max_iterations: 30,
    // Si le modèle refuse une requête, l'API la relance automatiquement sur un modèle de secours.
    ...fallback,
    output_config: { effort },
    cache_control: { type: "ephemeral" },
    system: systemPrompt(agent),
    tools: buildTools({ agent, taskId, delegate, model }),
    messages: [
      {
        role: "user",
        content: `Date du jour : ${new Date().toISOString().slice(0, 10)}\n\nTâche : ${task.instruction}`,
      },
    ],
  });

  let last: Anthropic.Beta.BetaMessage | null = null;
  let taskCost = 0;
  for await (const message of runner) {
    last = message;
    // Coût calculé au tarif du modèle qui a réellement répondu (il peut différer en cas de repli).
    taskCost += recordUsage(taskId, agent.id, message.model, message.usage);
    for (const block of message.content) {
      if (block.type === "text" && block.text.trim()) addLog(taskId, "message", block.text.trim());
      if (block.type === "server_tool_use") addLog(taskId, "tool", `${block.name} ${JSON.stringify(block.input)}`);
    }
    if (taskCap > 0 && taskCost >= taskCap) {
      finish(taskId, "error", `Tâche arrêtée : plafond de ${taskCap.toFixed(2)} $ par tâche atteint. Le travail déjà fait est conservé.`);
      return "Arrêtée (plafond par tâche).";
    }
    const over = budgetBlockReason();
    if (over) {
      finish(taskId, "error", `Tâche arrêtée : ${over}`);
      return "Arrêtée (budget mensuel).";
    }
  }

  if (!last) throw new Error("Aucune réponse du modèle.");
  if (last.stop_reason === "refusal") {
    finish(taskId, "error", "La demande a été refusée par le modèle.");
    return "Refusé.";
  }
  const text = last.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  const result = text || "Tâche terminée.";
  db.prepare("UPDATE tasks SET status = 'done', result = ?, finished_at = datetime('now') WHERE id = ?").run(
    result,
    taskId,
  );
  return result;
}
