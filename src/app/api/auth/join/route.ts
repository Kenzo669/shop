import { NextResponse } from "next/server";
import {
  acceptInvite,
  createUser,
  findUserByEmail,
  readInvite,
  startSession,
  validEmail,
  validatePassword,
  verifyPassword,
} from "@/lib/auth";

/** Rejoindre une entreprise avec une invitation : nouveau compte, ou compte existant. */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { token?: string; name?: string; email?: string; password?: string };
  const inv = b.token ? readInvite(b.token) : undefined;
  if (!inv || !b.token) return NextResponse.json({ error: "Invitation invalide ou expirée." }, { status: 400 });
  const email = (b.email ?? "").trim();
  if (!validEmail(email)) return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
  const existing = findUserByEmail(email);
  let userId: number;
  if (existing) {
    if (!(await verifyPassword(b.password ?? "", existing.password_hash))) {
      return NextResponse.json({ error: "Un compte existe avec cette adresse : saisissez son mot de passe." }, { status: 401 });
    }
    userId = existing.id;
  } else {
    const pwErr = validatePassword(b.password ?? "");
    if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 });
    if (!b.name?.trim()) return NextResponse.json({ error: "Votre nom est requis." }, { status: 400 });
    userId = await createUser({ name: b.name, email, password: b.password! });
  }
  const orgId = acceptInvite(b.token, userId);
  await startSession(userId, orgId);
  return NextResponse.json({ ok: true });
}
