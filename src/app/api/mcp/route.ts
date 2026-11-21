import { NextResponse } from "next/server";
import { AGENT_BY_ID } from "@/lib/agents";
import { deleteMcp, listMcp, refreshTools, updateMcp } from "@/lib/mcp";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ connections: listMcp() });
}

/** Réglages d'une connexion : agents autorisés, actions désactivées. */
export async function PATCH(req: Request) {
  const b = (await req.json()) as { id: number; agents?: string[]; disabled_tools?: string[] };
  updateMcp(b.id, {
    agents: b.agents?.filter((a) => AGENT_BY_ID[a]),
    disabled_tools: b.disabled_tools?.filter((t) => typeof t === "string"),
  });
  return NextResponse.json({ ok: true });
}

/** Relit la liste des actions proposées par l'outil (et teste la connexion). */
export async function POST(req: Request) {
  const { id } = (await req.json()) as { id: number };
  await refreshTools(id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { id } = (await req.json()) as { id: number };
  deleteMcp(id);
  return NextResponse.json({ ok: true });
}
