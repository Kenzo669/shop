import { NextResponse } from "next/server";
import { authed, createInvite } from "@/lib/auth";
import { currentTenant } from "@/lib/db";

/** Crée un lien d'invitation (valable 7 jours, une seule utilisation). */
async function POST_handler(req: Request) {
  const { role } = (await req.json().catch(() => ({}))) as { role?: "owner" | "member" };
  const t = currentTenant();
  const token = createInvite(t.orgId, t.userId!, role === "owner" ? "owner" : "member");
  const base = (process.env.APP_URL ?? new URL(req.url).origin).replace(/\/$/, "");
  return NextResponse.json({ url: `${base}/invitation/${token}` });
}

export const POST = authed("POST", POST_handler, { ownerOnly: true });
