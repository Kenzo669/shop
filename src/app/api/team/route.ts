import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { weekPlanning } from "@/lib/business";
import { authed } from "@/lib/auth";

export const dynamic = "force-dynamic";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function GET_handler(req: NextRequest) {
  const week = req.nextUrl.searchParams.get("week");
  return NextResponse.json(weekPlanning(week && DATE.test(week) ? week : new Date().toISOString().slice(0, 10)));
}

type Body =
  | { action: "add_employee"; name: string; role?: string; weekly_hours?: number; notes?: string; email?: string }
  | { action: "remove_employee"; id: number }
  | { action: "add_shift"; employee_id: number; date: string; start: string; end: string; label?: string }
  | { action: "delete_shift"; id: number }
  | { action: "add_leave"; employee_id: number; start_date: string; end_date: string; type?: string }
  | { action: "delete_leave"; id: number };

async function POST_handler(req: Request) {
  const b = (await req.json()) as Body;
  const bad = (msg: string) => NextResponse.json({ error: msg }, { status: 400 });
  switch (b.action) {
    case "add_employee":
      if (!b.name?.trim()) return bad("nom requis");
      db.prepare("INSERT INTO employees (name, role, email, weekly_hours, notes) VALUES (?, ?, ?, ?, ?)").run(
        b.name.trim(),
        b.role || null,
        b.email || null,
        b.weekly_hours || 35,
        b.notes || null,
      );
      break;
    case "remove_employee":
      db.prepare("UPDATE employees SET active = 0 WHERE id = ?").run(b.id);
      break;
    case "add_shift":
      if (!DATE.test(b.date) || !TIME.test(b.start) || !TIME.test(b.end)) return bad("date ou heure invalide");
      db.prepare("INSERT INTO shifts (employee_id, date, start, end, label) VALUES (?, ?, ?, ?, ?)").run(
        b.employee_id,
        b.date,
        b.start,
        b.end,
        b.label || null,
      );
      break;
    case "delete_shift":
      db.prepare("DELETE FROM shifts WHERE id = ?").run(b.id);
      break;
    case "add_leave":
      if (!DATE.test(b.start_date) || !DATE.test(b.end_date)) return bad("dates invalides");
      db.prepare("INSERT INTO leaves (employee_id, start_date, end_date, type) VALUES (?, ?, ?, ?)").run(
        b.employee_id,
        b.start_date,
        b.end_date,
        b.type || "congés",
      );
      break;
    case "delete_leave":
      db.prepare("DELETE FROM leaves WHERE id = ?").run(b.id);
      break;
    default:
      return bad("action inconnue");
  }
  return NextResponse.json({ ok: true });
}

export const GET = authed("GET", GET_handler);
export const POST = authed("POST", POST_handler);
