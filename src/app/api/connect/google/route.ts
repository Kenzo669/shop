import crypto from "crypto";
import { NextResponse } from "next/server";
import { googleAuthUrl, googleConfigured } from "@/lib/google";

/** Étape 1 : envoie l'utilisateur sur la page de consentement Google. */
export function GET(req: Request) {
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/?connect_error=google_non_configure", req.url));
  }
  const state = crypto.randomBytes(16).toString("hex");
  const res = NextResponse.redirect(googleAuthUrl(state));
  res.cookies.set("oauth_state", state, { httpOnly: true, sameSite: "lax", maxAge: 600, path: "/" });
  return res;
}
