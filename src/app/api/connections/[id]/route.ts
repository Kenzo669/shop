import { NextResponse } from "next/server";
import { deleteConnection } from "@/lib/connections";
import { revokeGoogle } from "@/lib/google";
import { authed } from "@/lib/auth";

/** Déconnecte un compte : supprime les jetons et retire l'accès côté Google. */
async function DELETE_handler(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = deleteConnection(Number(id));
  if (row?.provider === "google") await revokeGoogle(row.refreshToken ?? row.accessToken);
  return NextResponse.json({ ok: true });
}

export const DELETE = authed("DELETE", DELETE_handler, { ownerOnly: true });
