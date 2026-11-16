import { NextResponse } from "next/server";
import { getCompanyProfile, setCompanyProfile } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ profile: getCompanyProfile() });
}

export async function PUT(req: Request) {
  const { profile } = (await req.json()) as { profile?: string };
  if (!profile?.trim()) return NextResponse.json({ error: "profil vide" }, { status: 400 });
  setCompanyProfile(profile.trim());
  return NextResponse.json({ ok: true });
}
