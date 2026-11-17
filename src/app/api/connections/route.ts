import { NextResponse } from "next/server";
import { listConnections } from "@/lib/connections";
import { googleConfigured } from "@/lib/google";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    connections: listConnections().map((c) => ({ id: c.id, provider: c.provider, account_email: c.account_email, created_at: c.created_at })),
    available: { google: googleConfigured() },
  });
}
