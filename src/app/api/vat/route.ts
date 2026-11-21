import { NextResponse, type NextRequest } from "next/server";
import { setSetting } from "@/lib/db";
import { getVatRegime, nextVatDeadline, vatReturn, type VatRegime } from "@/lib/business";
import { authed } from "@/lib/auth";

export const dynamic = "force-dynamic";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function GET_handler(req: NextRequest) {
  const next = nextVatDeadline();
  const from = req.nextUrl.searchParams.get("from") ?? next?.from;
  const to = req.nextUrl.searchParams.get("to") ?? next?.to;
  if (!from || !to || !DATE.test(from) || !DATE.test(to)) {
    return NextResponse.json({ regime: getVatRegime(), next, result: null });
  }
  return NextResponse.json({ regime: getVatRegime(), next, result: vatReturn(from, to) });
}

async function PUT_handler(req: Request) {
  const { regime } = (await req.json()) as { regime?: VatRegime };
  if (!regime || !["mensuel", "trimestriel", "franchise"].includes(regime)) {
    return NextResponse.json({ error: "régime invalide" }, { status: 400 });
  }
  setSetting("vat_regime", regime);
  return NextResponse.json({ ok: true });
}

export const GET = authed("GET", GET_handler);
export const PUT = authed("PUT", PUT_handler, { ownerOnly: true });
