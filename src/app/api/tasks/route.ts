import { NextResponse } from "next/server";
import { createTask, startTask } from "@/lib/runner";
import { AGENT_BY_ID } from "@/lib/agents";

export async function POST(req: Request) {
  const { agentId, instruction } = (await req.json()) as { agentId?: string; instruction?: string };
  if (!agentId || !AGENT_BY_ID[agentId] || !instruction?.trim()) {
    return NextResponse.json({ error: "agentId et instruction requis" }, { status: 400 });
  }
  const id = createTask(agentId, instruction.trim());
  void startTask(id); // tourne en arrière-plan ; l'interface suit l'avancement
  return NextResponse.json({ id });
}
