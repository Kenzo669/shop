import { NextResponse } from "next/server";
import { createAccount, findUserByEmail, startSession, validEmail, validatePassword } from "@/lib/auth";
import { runAsOrg, setCompanyProfile } from "@/lib/db";

/** Inscription : crée le compte, l'entreprise et la session. */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { name?: string; email?: string; password?: string; orgName?: string };
  const name = b.name?.trim() ?? "";
  const email = b.email?.trim() ?? "";
  const orgName = b.orgName?.trim() ?? "";
  if (!name || !orgName) return NextResponse.json({ error: "Nom et entreprise requis." }, { status: 400 });
  if (!validEmail(email)) return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
  const pwErr = validatePassword(b.password ?? "");
  if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 });
  if (findUserByEmail(email)) return NextResponse.json({ error: "Un compte existe déjà avec cette adresse : connectez-vous." }, { status: 409 });
  const { userId, orgId } = await createAccount({ name, email, password: b.password!, orgName });
  // Profil de départ : les agents connaissent au moins le nom de l'entreprise.
  runAsOrg({ orgId, userId, role: "owner" }, () =>
    setCompanyProfile(`Nom : ${orgName}
Activité : (décrivez votre activité, vos produits ou services)
Ville / pays : France
Clients cibles : (qui sont vos clients ?)
Ton de communication : professionnel et chaleureux
Signature des mails : ${name}, ${orgName}`),
  );
  await startSession(userId, orgId);
  return NextResponse.json({ ok: true });
}
