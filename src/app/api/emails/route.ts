import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authed } from "@/lib/auth";

/** Ajoute un mail reçu (copier-coller) pour que Léa puisse le traiter. */
async function POST_handler(req: Request) {
  const { from, subject, body } = (await req.json()) as { from?: string; subject?: string; body?: string };
  if (!subject?.trim() || !body?.trim()) return NextResponse.json({ error: "objet et contenu requis" }, { status: 400 });
  const r = db
    .prepare("INSERT INTO emails (direction, status, from_addr, subject, body) VALUES ('in', 'received', ?, ?, ?)")
    .run(from ?? "", subject, body);
  return NextResponse.json({ id: Number(r.lastInsertRowid) });
}

export const POST = authed("POST", POST_handler);
