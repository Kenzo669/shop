import { NextResponse } from "next/server";
import { todayOverview } from "@/lib/business";
import { getBudget, monthSpend } from "@/lib/billing";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ ...todayOverview(), ai: { spent: monthSpend(), budget: getBudget() } });
}
