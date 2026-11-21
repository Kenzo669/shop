import { NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  clearFailures,
  findUserByEmail,
  membershipsOf,
  recordFailure,
  startSession,
  tooManyAttempts,
  verifyAgainstDummy,
  verifyPassword,
} from "@/lib/auth";

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  const email = (b.email ?? "").trim().toLowerCase();
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  const keys = [`e:${email}`, `ip:${ip}`];
  if (keys.some(tooManyAttempts)) {
    return NextResponse.json({ error: "Trop de tentatives. Réessayez dans 15 minutes." }, { status: 429 });
  }
  const user = findUserByEmail(email);
  // Même message et même travail de calcul que le compte existe ou non.
  const ok = user ? await verifyPassword(b.password ?? "", user.password_hash) : await verifyAgainstDummy(b.password ?? "");
  if (!user || !ok) {
    keys.forEach(recordFailure);
    return NextResponse.json({ error: "Email ou mot de passe incorrect." }, { status: 401 });
  }
  keys.forEach(clearFailures);
  const orgs = membershipsOf(user.id);
  if (!orgs.length) return NextResponse.json({ error: "Ce compte n'est rattaché à aucune entreprise." }, { status: 403 });
  await startSession(user.id, orgs[0].org_id);
  return NextResponse.json({ ok: true });
}
