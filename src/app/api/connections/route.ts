import { NextResponse } from "next/server";
import { listConnections } from "@/lib/connections";
import { googleConfigured } from "@/lib/google";
import { authed } from "@/lib/auth";

export const dynamic = "force-dynamic";

function GET_handler() {
  return NextResponse.json({
    connections: listConnections().map((c) => ({ id: c.id, provider: c.provider, account_email: c.account_email, created_at: c.created_at })),
    available: { google: googleConfigured() },
  });
}

export const GET = authed("GET", GET_handler);
