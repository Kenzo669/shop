import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { markInvoicePaid } from "@/lib/business";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { action } = (await req.json()) as { action?: "paid" | "cancel" };
  try {
    if (action === "paid") return NextResponse.json({ message: markInvoicePaid(Number(id)) });
    if (action === "cancel") {
      db.prepare("UPDATE invoices SET status = 'annulée' WHERE id = ? AND status != 'payée'").run(Number(id));
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "action inconnue" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
