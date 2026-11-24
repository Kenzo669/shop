import { NextResponse } from "next/server";
import { todayOverview } from "@/lib/business";
import { getBudget, monthSpend } from "@/lib/billing";
import { sectorAlerts } from "@/lib/sectors";
import { authed } from "@/lib/auth";

export const dynamic = "force-dynamic";

function GET_handler() {
  return NextResponse.json({ ...todayOverview(), sectorAlerts: sectorAlerts(), ai: { spent: monthSpend(), budget: getBudget() } });
}

export const GET = authed("GET", GET_handler);
