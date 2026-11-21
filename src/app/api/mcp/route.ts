import { NextResponse } from "next/server";
import { AGENT_BY_ID } from "@/lib/agents";
import { deleteMcp, listMcp, refreshTools, updateMcp } from "@/lib/mcp";
import { authed } from "@/lib/auth";

export const dynamic = "force-dynamic";

function GET_handler() {
  return NextResponse.json({ connections: listMcp() });
}

/** Réglages d'une connexion : agents autorisés, actions désactivées. */
async function PATCH_handler(req: Request) {
  const b = (await req.json()) as { id: number; agents?: string[]; disabled_tools?: string[] };
  updateMcp(b.id, {
    agents: b.agents?.filter((a) => AGENT_BY_ID[a]),
    disabled_tools: b.disabled_tools?.filter((t) => typeof t === "string"),
  });
  return NextResponse.json({ ok: true });
}

/** Relit la liste des actions proposées par l'outil (et teste la connexion). */
async function POST_handler(req: Request) {
  const { id } = (await req.json()) as { id: number };
  await refreshTools(id);
  return NextResponse.json({ ok: true });
}

async function DELETE_handler(req: Request) {
  const { id } = (await req.json()) as { id: number };
  deleteMcp(id);
  return NextResponse.json({ ok: true });
}

export const GET = authed("GET", GET_handler);
export const PATCH = authed("PATCH", PATCH_handler, { ownerOnly: true });
export const POST = authed("POST", POST_handler, { ownerOnly: true });
export const DELETE = authed("DELETE", DELETE_handler, { ownerOnly: true });
