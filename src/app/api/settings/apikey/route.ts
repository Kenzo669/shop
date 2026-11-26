import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { authed } from "@/lib/auth";
import { desktopMode, looksLikeApiKey, saveApiKey } from "@/lib/apikey";

export const dynamic = "force-dynamic";

async function POST_handler(req: Request) {
  if (!desktopMode()) {
    return NextResponse.json({ error: "La clé API se règle sur le serveur (variable ANTHROPIC_API_KEY)." }, { status: 403 });
  }
  const { key } = (await req.json().catch(() => ({}))) as { key?: string };
  const k = (key ?? "").trim();
  if (!looksLikeApiKey(k)) {
    return NextResponse.json({ error: "Ce n'est pas une clé API Claude : elle commence par « sk-ant- »." }, { status: 400 });
  }
  // Vérifie la clé auprès d'Anthropic avant de l'enregistrer (appel gratuit).
  try {
    await new Anthropic({ apiKey: k }).models.list({ limit: 1 });
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 401 || status === 403) {
      return NextResponse.json({ error: "Clé refusée par Anthropic : vérifiez-la ou créez-en une nouvelle." }, { status: 400 });
    }
    // Pas de réseau ou service indisponible : on enregistre quand même, la clé sera testée à la première tâche.
  }
  saveApiKey(k);
  return NextResponse.json({ ok: true });
}

export const POST = authed("POST", POST_handler, { ownerOnly: true });
