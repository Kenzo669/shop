import { NextResponse, type NextRequest } from "next/server";
import { finishOAuth } from "@/lib/mcp";
import { authed } from "@/lib/auth";

/** Retour de la page de consentement de l'éditeur. */
async function GET_handler(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const back = (p: string) => NextResponse.redirect(new URL(`/?${p}`, req.url));
  const error = q.get("error");
  if (error) return back(`connect_error=${encodeURIComponent(q.get("error_description") ?? error)}`);
  const code = q.get("code");
  const state = q.get("state");
  if (!code || !state) return back("connect_error=etat_invalide");
  try {
    const name = await finishOAuth(state, code);
    return back(`connected=${encodeURIComponent(name)}`);
  } catch (err) {
    return back(`connect_error=${encodeURIComponent(err instanceof Error ? err.message : String(err))}`);
  }
}

export const GET = authed("GET", GET_handler);
