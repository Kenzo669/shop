import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mailer";

type Email = { id: number; status: string; to_addr: string; subject: string; body: string };

/** Valide et envoie un brouillon (action humaine), avec modifications éventuelles. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const email = db.prepare("SELECT * FROM emails WHERE id = ?").get(Number(id)) as Email | undefined;
  if (!email || email.status !== "draft") return NextResponse.json({ error: "brouillon introuvable" }, { status: 404 });
  const edits = (await req.json().catch(() => ({}))) as Partial<{ to: string; subject: string; body: string }>;
  const to = edits.to ?? email.to_addr;
  const subject = edits.subject ?? email.subject;
  const body = edits.body ?? email.body;
  if (!to) return NextResponse.json({ error: "destinataire manquant" }, { status: 400 });
  try {
    await sendMail(to, subject, body);
    db.prepare("UPDATE emails SET status = 'sent', to_addr = ?, subject = ?, body = ? WHERE id = ?").run(to, subject, body, email.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  db.prepare("DELETE FROM emails WHERE id = ? AND status = 'draft'").run(Number(id));
  return NextResponse.json({ ok: true });
}
