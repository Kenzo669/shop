import { NextResponse } from "next/server";
import { isEmpty, loadDemo, resetData } from "@/lib/demo";
import { authed } from "@/lib/auth";

export const dynamic = "force-dynamic";

function GET_handler() {
  return NextResponse.json({ empty: isEmpty() });
}

async function POST_handler(req: Request) {
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

export const GET = authed("GET", GET_handler);
export const POST = authed("POST", POST_handler, { ownerOnly: true });
