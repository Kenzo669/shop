import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { AGENT_BY_ID } from "@/lib/agents";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ recurring: db.prepare("SELECT * FROM recurring ORDER BY id").all() });
}

export async function POST(req: Request) {
  const b = (await req.json()) as {
    agent_id: string;
    instruction: string;
    frequency: "daily" | "weekly" | "monthly";
    weekday?: number;
    monthday?: number;
    hour: number;
  };
  if (!AGENT_BY_ID[b.agent_id] || !b.instruction?.trim() || !["daily", "weekly", "monthly"].includes(b.frequency)) {
    return NextResponse.json({ error: "champs invalides" }, { status: 400 });
  }
  const hour = Math.min(23, Math.max(0, Math.round(b.hour)));
  db.prepare(
    "INSERT INTO recurring (agent_id, instruction, frequency, weekday, monthday, hour) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(
    b.agent_id,
    b.instruction.trim(),
    b.frequency,
    b.frequency === "weekly" ? Math.min(7, Math.max(1, b.weekday ?? 1)) : null,
    b.frequency === "monthly" ? Math.min(28, Math.max(1, b.monthday ?? 1)) : null,
    hour,
  );
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const { id, enabled } = (await req.json()) as { id: number; enabled: boolean };
  db.prepare("UPDATE recurring SET enabled = ? WHERE id = ?").run(enabled ? 1 : 0, id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { id } = (await req.json()) as { id: number };
  db.prepare("DELETE FROM recurring WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
