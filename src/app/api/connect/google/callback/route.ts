import { NextResponse, type NextRequest } from "next/server";
import { finishGoogleConnect } from "@/lib/google";

/** Étape 2 : Google renvoie ici avec un code, qu'on échange contre l'accès au compte. */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const back = (q: string) => {
    const res = NextResponse.redirect(new URL(`/?${q}`, req.url));
    res.cookies.delete("oauth_state");
    return res;
  };
  const error = url.searchParams.get("error");
  if (error) return back(`connect_error=${encodeURIComponent(error)}`);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state || state !== req.cookies.get("oauth_state")?.value) {
    return back("connect_error=etat_invalide");
  }
  try {
    const email = await finishGoogleConnect(code);
    return back(`connected=${encodeURIComponent(email)}`);
  } catch (err) {
    return back(`connect_error=${encodeURIComponent(err instanceof Error ? err.message : String(err))}`);
  }
}
