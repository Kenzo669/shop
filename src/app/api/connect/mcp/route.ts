import { NextResponse } from "next/server";
import { AGENT_BY_ID } from "@/lib/agents";
import { CATALOG_BY_ID } from "@/lib/catalog";
import { connectWithToken, startOAuth } from "@/lib/mcp";

/** Démarre la connexion d'un outil : OAuth (renvoie l'adresse de consentement) ou clé d'accès. */
export async function POST(req: Request) {
  const b = (await req.json()) as {
    catalogId?: string;
    name?: string;
    url?: string;
    method?: "oauth" | "token";
    token?: string;
    agents?: string[];
  };
  const entry = b.catalogId ? CATALOG_BY_ID[b.catalogId] : undefined;
  const catalogId = entry ? entry.id : "custom";
  const name = (b.name?.trim() || entry?.name || "Outil").slice(0, 60);
  const url = (b.url?.trim() || entry?.url || "").trim();
  const agents = (b.agents ?? entry?.agents ?? ["direction"]).filter((a) => AGENT_BY_ID[a]);
  if (!url) return NextResponse.json({ error: "Adresse du serveur manquante." }, { status: 400 });
  try {
    if (b.method === "token") {
      // Pour Make, la « clé » est l'adresse personnelle complète.
      if (entry?.urlFromToken) {
        await connectWithToken({ catalogId, name, url: b.token ?? "", agents });
      } else {
        if (!b.token?.trim()) return NextResponse.json({ error: "Clé d'accès manquante." }, { status: 400 });
        await connectWithToken({ catalogId, name, url, token: b.token, agents });
      }
      return NextResponse.json({ connected: name });
    }
    const r = await startOAuth({ catalogId, name, url, agents });
    if (r.noAuth) {
      await connectWithToken({ catalogId, name, url: r.url, agents });
      return NextResponse.json({ connected: name });
    }
    return NextResponse.json({ authorizeUrl: r.authorizeUrl });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
