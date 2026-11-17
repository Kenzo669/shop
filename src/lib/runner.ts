import Anthropic from "@anthropic-ai/sdk";
import { addLog, db, getCompanyProfile, type Task } from "./db";
import { AGENT_BY_ID, type AgentDef } from "./agents";
import { buildTools } from "./tools";
import { listConnections } from "./connections";

const MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-5-5";
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

  const delegate = async (agentId: string, instruction: string) => {
    if (depth >= MAX_DELEGATION_DEPTH) return "Délégation refusée : trop de niveaux de sous-tâches.";
    const childId = createTask(agentId, instruction, taskId);
    addLog(taskId, "message", `→ Tâche n°${childId} confiée à ${AGENT_BY_ID[agentId].name}`);
    return startTask(childId, depth + 1);
  };

  const runner = getClient().beta.messages.toolRunner({
    model: MODEL,
    max_tokens: 16000,
    max_iterations: 30,
    // Si le modèle refuse une requête, l'API la relance automatiquement sur un modèle de secours.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium" },
    cache_control: { type: "ephemeral" },
    system: systemPrompt(agent),
    tools: buildTools({ agent, taskId, delegate }),
    messages: [
      {
        role: "user",
        content: `Date du jour : ${new Date().toISOString().slice(0, 10)}\n\nTâche : ${task.instruction}`,
      },
    ],
  });

  let last: Anthropic.Beta.BetaMessage | null = null;
  for await (const message of runner) {
    last = message;
    for (const block of message.content) {
      if (block.type === "text" && block.text.trim()) addLog(taskId, "message", block.text.trim());
      if (block.type === "server_tool_use") addLog(taskId, "tool", `${block.name} ${JSON.stringify(block.input)}`);
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
