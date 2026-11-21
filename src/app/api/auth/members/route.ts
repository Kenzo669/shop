import { NextResponse } from "next/server";
import { authed, currentSession, listMembers, removeMember, renameOrg } from "@/lib/auth";
import { currentTenant } from "@/lib/db";

export const dynamic = "force-dynamic";

async function GET_handler() {
  const s = await currentSession();
  return NextResponse.json({
    me: s ? { id: s.user.id, name: s.user.name, email: s.user.email, role: s.role } : null,
    org: s ? { id: s.orgId, name: s.orgName } : null,
    members: listMembers(currentTenant().orgId),
  });
}

/** Renommer l'entreprise (propriétaire). */
async function PATCH_handler(req: Request) {
  const { name } = (await req.json()) as { name?: string };
  if (!name?.trim()) return NextResponse.json({ error: "Nom requis." }, { status: 400 });
  renameOrg(currentTenant().orgId, name);
  return NextResponse.json({ ok: true });
}

/** Retirer un membre (propriétaire). */
async function DELETE_handler(req: Request) {
  const { userId } = (await req.json()) as { userId?: number };
  try {
    removeMember(currentTenant().orgId, Number(userId));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}

export const GET = authed("GET", GET_handler);
export const PATCH = authed("PATCH", PATCH_handler, { ownerOnly: true });
export const DELETE = authed("DELETE", DELETE_handler, { ownerOnly: true });
