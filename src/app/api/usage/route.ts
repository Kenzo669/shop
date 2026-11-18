import { NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";
import { MODELS, getAgentSettings, isModelId, monthSpend, setAgentSettings, setBudget, usageReport, type AgentAiSettings } from "@/lib/billing";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ...usageReport(),
    monthSpend: monthSpend(),
    taskCap: getSetting<number>("task_cap_usd", 3),
    models: Object.entries(MODELS).map(([id, m]) => ({ id, ...m })),
  });
}

/** Réglages : budget mensuel, plafond par tâche, modèle et effort de chaque agent. */
export async function PUT(req: Request) {
  const body = (await req.json()) as {
    budget?: number;
    taskCap?: number;
    agents?: Record<string, AgentAiSettings>;
  };
  if (typeof body.budget === "number") setBudget(body.budget);
  if (typeof body.taskCap === "number") setSetting("task_cap_usd", Math.max(0, body.taskCap));
  if (body.agents) {
    const current = getAgentSettings();
    for (const [id, s] of Object.entries(body.agents)) {
      if (!current[id] || !isModelId(s.model) || !["low", "medium", "high"].includes(s.effort)) {
        return NextResponse.json({ error: `réglage invalide pour ${id}` }, { status: 400 });
      }
      current[id] = { model: s.model, effort: s.effort };
    }
    setAgentSettings(current);
  }
  return NextResponse.json({ ok: true });
}
