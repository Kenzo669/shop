import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authed } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function GET_handler(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(Number(id));
  if (!task) return NextResponse.json({ error: "introuvable" }, { status: 404 });
  const logs = db.prepare("SELECT * FROM task_logs WHERE task_id = ? ORDER BY id").all(Number(id));
  const children = db.prepare("SELECT id, agent_id, status FROM tasks WHERE parent_task_id = ?").all(Number(id));
  return NextResponse.json({ task, logs, children });
}

export const GET = authed("GET", GET_handler);
