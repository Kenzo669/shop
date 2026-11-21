import { NextResponse } from "next/server";
import { isEmpty, loadDemo, resetData } from "@/lib/demo";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ empty: isEmpty() });
}

export async function POST(req: Request) {
  const { action } = (await req.json()) as { action?: "load" | "reset" };
  try {
    if (action === "load") loadDemo();
    else if (action === "reset") resetData();
    else return NextResponse.json({ error: "action inconnue" }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
