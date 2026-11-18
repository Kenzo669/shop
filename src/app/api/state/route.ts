import { NextResponse } from "next/server";
import { db, type Task } from "@/lib/db";
import { aiConfigured } from "@/lib/runner";
import { smtpConfigured } from "@/lib/mailer";
import { listConnections } from "@/lib/connections";
import { getBudget, monthSpend } from "@/lib/billing";

export const dynamic = "force-dynamic";

export function GET() {
  const tasks = db.prepare("SELECT * FROM tasks ORDER BY id DESC LIMIT 100").all() as Task[];
  const working = db
    .prepare("SELECT DISTINCT agent_id FROM tasks WHERE status IN ('queued', 'running')")
    .all() as { agent_id: string }[];
  return NextResponse.json({
    tasks,
    working: working.map((w) => w.agent_id),
    aiConfigured: aiConfigured(),
    smtpConfigured: smtpConfigured(),
    monthSpend: monthSpend(),
    budget: getBudget(),
    connections: listConnections().map((c) => ({ provider: c.provider, account_email: c.account_email })),
  });
}
