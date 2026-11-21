import { NextResponse } from "next/server";
import { getCompanyProfile, setCompanyProfile } from "@/lib/db";
import { authed } from "@/lib/auth";

export const dynamic = "force-dynamic";

function GET_handler() {
  return NextResponse.json({ profile: getCompanyProfile() });
}

async function PUT_handler(req: Request) {
  const { profile } = (await req.json()) as { profile?: string };
  if (!profile?.trim()) return NextResponse.json({ error: "profil vide" }, { status: 400 });
  setCompanyProfile(profile.trim());
  return NextResponse.json({ ok: true });
}

export const GET = authed("GET", GET_handler);
export const PUT = authed("PUT", PUT_handler);
