import { NextResponse } from "next/server";
import { todayOverview } from "@/lib/business";
import { getBudget, monthSpend } from "@/lib/billing";
import { authed } from "@/lib/auth";

export const dynamic = "force-dynamic";

function GET_handler() {
  return NextResponse.json({ ...todayOverview(), ai: { spent: monthSpend(), budget: getBudget() } });
}

export const GET = authed("GET", GET_handler);
