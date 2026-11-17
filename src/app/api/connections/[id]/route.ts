import { NextResponse } from "next/server";
import { deleteConnection } from "@/lib/connections";
import { revokeGoogle } from "@/lib/google";

/** Déconnecte un compte : supprime les jetons et retire l'accès côté Google. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = deleteConnection(Number(id));
  if (row?.provider === "google") await revokeGoogle(row.refreshToken ?? row.accessToken);
  return NextResponse.json({ ok: true });
}
