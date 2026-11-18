import { NextResponse } from "next/server";
import { createInvoice, listInvoices, type InvoiceLine } from "@/lib/business";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ invoices: listInvoices() });
}

/** Création d'une facture depuis le formulaire (sans IA). */
export async function POST(req: Request) {
  const b = (await req.json()) as {
    client?: string;
    client_email?: string;
    client_address?: string;
    due_days?: number;
    lines?: InvoiceLine[];
  };
  const lines = (b.lines ?? []).filter((l) => l.label?.trim() && l.qty > 0);
  if (!b.client?.trim() || !lines.length) {
    return NextResponse.json({ error: "client et au moins une ligne requis" }, { status: 400 });
  }
  if (lines.some((l) => ![0, 2.1, 5.5, 10, 20].includes(l.vat_rate) || !(l.unit_price_ht >= 0))) {
    return NextResponse.json({ error: "taux de TVA ou prix invalide" }, { status: 400 });
  }
  return NextResponse.json(
    createInvoice({
      client: b.client.trim(),
      client_email: b.client_email || undefined,
      client_address: b.client_address || undefined,
      due_days: b.due_days || 30,
      lines,
    }),
  );
}
