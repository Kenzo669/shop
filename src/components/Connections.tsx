"use client";

import { useCallback, useEffect, useState } from "react";
import { AGENTS } from "@/lib/agents";
import { CATALOG, CATALOG_BY_ID, type CatalogEntry } from "@/lib/catalog";
import { Modal, postJson } from "./shared";

type GoogleData = {
  connections: { id: number; provider: string; account_email: string; created_at: string }[];
  available: { google: boolean };
};
type McpTool = { name: string; description: string; readOnly: boolean; destructive: boolean };
type McpConnection = {
  id: number;
  catalog_id: string;
  name: string;
  url: string;
  auth: "oauth" | "token" | "none";
  agents: string[];
  tools: McpTool[] | null;
  disabled_tools: string[];
  last_error: string | null;
};

const CATEGORIES = ["Automatisation", "Documents & projets", "Ventes & clients", "Paiements", "Support client"] as const;

export default function ConnectionsModal({ notice, onClose }: { notice: { ok: boolean; text: string } | null; onClose: () => void }) {
  const [google, setGoogle] = useState<GoogleData | null>(null);
  const [mcp, setMcp] = useState<McpConnection[]>([]);
  const [open, setOpen] = useState<string | null>(null); // entrée du catalogue en cours de connexion
  const load = useCallback(() => {
    fetch("/api/connections").then((r) => r.json()).then(setGoogle);
    fetch("/api/mcp").then((r) => r.json()).then((d) => setMcp(d.connections));
  }, []);
  useEffect(load, [load]);

  const googleAccounts = google?.connections.filter((c) => c.provider === "google") ?? [];

  return (
    <Modal title="Connexions" subtitle="Reliez vos outils : vos agents travaillent directement dedans." onClose={onClose} wide>
      {notice && (
        <div className={`mb-3 rounded-md p-2 text-sm ${notice.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{notice.text}</div>
      )}

      {mcp.length + googleAccounts.length > 0 && (
        <section className="mb-5">
          <h3 className="mb-2 text-sm font-semibold">Connectés ({mcp.length + googleAccounts.length})</h3>
          <ul className="space-y-2">
            {googleAccounts.map((a) => (
              <li key={`g${a.id}`} className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-sm">
                <Logo text="G" color="#4285f4" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">Google — Gmail et Agenda</div>
                  <div className="truncate text-xs text-gray-500">{a.account_email} · Léa, Nora</div>
                </div>
                <button
                  className="text-xs text-red-600 hover:underline"
                  onClick={async () => {
                    if (!confirm(`Déconnecter ${a.account_email} ?`)) return;
                    await fetch(`/api/connections/${a.id}`, { method: "DELETE" });
                    load();
                  }}
                >
                  Déconnecter
                </button>
              </li>
            ))}
            {mcp.map((c) => (
              <ConnectedTool key={c.id} c={c} onChange={load} />
            ))}
          </ul>
        </section>
      )}

      <h3 className="mb-2 text-sm font-semibold">Messagerie & agenda</h3>
      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        <Card logo="G" color="#4285f4" name="Google" desc="Gmail et Google Agenda · Léa, Nora">
          <a
            href="/api/connect/google"
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
              google?.available.google ? "bg-slate-800 text-white hover:bg-slate-700" : "pointer-events-none bg-gray-100 text-gray-400"
            }`}
          >
            {googleAccounts.length ? "Ajouter" : "Connecter"}
          </a>
        </Card>
        <Card logo="O" color="#0078d4" name="Microsoft 365" desc="Outlook et Calendrier — via Zapier en attendant">
          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500">Bientôt</span>
        </Card>
      </div>
      {google && !google.available.google && (
        <p className="-mt-2 mb-4 text-xs text-amber-700">Google : à configurer par l&apos;administrateur (GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET, voir README).</p>
      )}

      {CATEGORIES.map((cat) => (
        <section key={cat} className="mb-4">
          <h3 className="mb-2 text-sm font-semibold">
            {cat}
            {cat === "Automatisation" && <span className="ml-2 text-xs font-normal text-gray-500">le plus puissant : des milliers d&apos;applications en une connexion</span>}
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {CATALOG.filter((e) => e.category === cat).map((e) => {
              const count = mcp.filter((c) => c.catalog_id === e.id).length;
              return (
                <div key={e.id} className={open === e.id ? "sm:col-span-2" : ""}>
                  <Card logo={e.logo} color={e.color} name={e.name} desc={e.desc} connected={count > 0}>
                    <button
                      className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-700"
                      onClick={() => setOpen(open === e.id ? null : e.id)}
                    >
                      {count ? "Ajouter" : "Connecter"}
                    </button>
                  </Card>
                  {open === e.id && <ConnectForm entry={e} onDone={() => { setOpen(null); load(); }} />}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <section className="mb-2">
        <h3 className="mb-2 text-sm font-semibold">Autre outil</h3>
        <Card logo="+" color="#64748b" name="N'importe quel outil compatible MCP" desc="Collez l'adresse du serveur MCP fournie par l'éditeur">
          <button className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50" onClick={() => setOpen(open === "custom" ? null : "custom")}>
            Ajouter
          </button>
        </Card>
        {open === "custom" && <ConnectForm onDone={() => { setOpen(null); load(); }} />}
      </section>

      <p className="mt-4 text-xs text-gray-500">
        🔒 Les accès sont chiffrés et jamais montrés à l&apos;IA. Pour chaque outil, vous choisissez quels agents l&apos;utilisent et
        quelles actions sont permises ; les actions destructrices (supprimer, rembourser…) sont désactivées par défaut.
      </p>
    </Modal>
  );
}

function Logo({ text, color }: { text: string; color: string }) {
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-sm font-bold text-white" style={{ background: color }}>
      {text}
    </span>
  );
}

function Card({
  logo,
  color,
  name,
  desc,
  connected,
  children,
}: {
  logo: string;
  color: string;
  name: string;
  desc: string;
  connected?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <Logo text={logo} color={color} />
      <div className="min-w-0 flex-1">
        <div className="font-medium">
          {name} {connected && <span className="text-xs font-normal text-emerald-700">● connecté</span>}
        </div>
        <div className="text-xs text-gray-500">{desc}</div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function AgentPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {AGENTS.map((a) => {
        const on = value.includes(a.id);
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onChange(on ? value.filter((x) => x !== a.id) : [...value, a.id])}
            className={`rounded-full px-2 py-0.5 text-xs ${on ? "text-white" : "bg-slate-100 text-gray-500"}`}
            style={on ? { background: a.color } : undefined}
            title={a.role}
          >
            {a.name}
          </button>
        );
      })}
    </div>
  );
}

function ConnectForm({ entry, onDone }: { entry?: CatalogEntry; onDone: () => void }) {
  const methods = entry?.auth ?? ["oauth", "token"];
  const [method, setMethod] = useState<"oauth" | "token">(methods[0]);
  const [url, setUrl] = useState(entry?.url ?? "");
  const [name, setName] = useState(entry?.name ?? "");
  const [token, setToken] = useState("");
  const [agents, setAgents] = useState<string[]>(entry?.agents ?? ["direction"]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const urlFromToken = entry?.urlFromToken && method === "token";

  return (
    <div className="mt-2 space-y-3 rounded-lg border bg-slate-50 p-3 text-sm">
      {!entry && (
        <input className="w-full rounded border p-2" placeholder="Nom de l'outil (ex. Pipedrive)" value={name} onChange={(e) => setName(e.target.value)} />
      )}
      {methods.length > 1 && (
        <div className="flex gap-4">
          <label className="flex items-center gap-1">
            <input type="radio" checked={method === "oauth"} onChange={() => setMethod("oauth")} /> Se connecter avec mon compte
            {methods[0] === "oauth" && <span className="text-xs text-gray-400">(recommandé)</span>}
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" checked={method === "token"} onChange={() => setMethod("token")} /> Utiliser une clé d&apos;accès
          </label>
        </div>
      )}
      {!urlFromToken && (
        <label className="block text-xs text-gray-600">
          Adresse du serveur MCP
          <input className="mt-1 w-full rounded border p-2 font-mono text-xs" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </label>
      )}
      {method === "token" && (
        <label className="block text-xs text-gray-600">
          {urlFromToken ? "Votre adresse personnelle" : "Clé d'accès"}
          <input
            type="password"
            autoComplete="off"
            className="mt-1 w-full rounded border p-2 font-mono text-xs"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={urlFromToken ? "https://…" : "Collez la clé ici"}
          />
          {entry?.tokenHelp && <span className="mt-1 block text-gray-500">{entry.tokenHelp}</span>}
        </label>
      )}
      <div>
        <div className="mb-1 text-xs text-gray-600">Agents qui peuvent l&apos;utiliser</div>
        <AgentPicker value={agents} onChange={setAgents} />
      </div>
      <div className="flex items-center gap-3">
        <button
          disabled={busy || !agents.length}
          className="rounded-md bg-emerald-600 px-3 py-1.5 font-semibold text-white disabled:opacity-50"
          onClick={async () => {
            setBusy(true);
            setErr(null);
            try {
              const d = await postJson("/api/connect/mcp", { catalogId: entry?.id, name, url, method, token, agents });
              if (d.authorizeUrl) window.location.href = d.authorizeUrl;
              else onDone();
            } catch (e) {
              setErr(e instanceof Error ? e.message : String(e));
              setBusy(false);
            }
          }}
        >
          {busy ? "Connexion…" : method === "oauth" ? `Continuer chez ${entry?.name ?? "l'éditeur"}` : "Connecter"}
        </button>
        {err && <span className="text-xs text-red-600">{err}</span>}
      </div>
    </div>
  );
}

function ConnectedTool({ c, onChange }: { c: McpConnection; onChange: () => void }) {
  const entry = CATALOG_BY_ID[c.catalog_id];
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const patch = async (body: object) => {
    await postJson("/api/mcp", { id: c.id, ...body }, "PATCH");
    onChange();
  };
  const tools = c.tools ?? [];
  const enabled = tools.filter((t) => !c.disabled_tools.includes(t.name)).length;
  return (
    <li className={`rounded-lg border p-3 text-sm ${c.last_error ? "border-red-200 bg-red-50/40" : "border-emerald-200 bg-emerald-50/50"}`}>
      <div className="flex items-center gap-3">
        <Logo text={entry?.logo ?? "+"} color={entry?.color ?? "#64748b"} />
        <div className="min-w-0 flex-1">
          <div className="font-medium">{c.name}</div>
          <div className="text-xs text-gray-500">
            {c.last_error ? <span className="text-red-600">⚠️ {c.last_error}</span> : c.tools ? `${enabled} action(s) autorisée(s) sur ${tools.length}` : "Actions non listées"}
          </div>
        </div>
        <button className="text-xs text-slate-600 hover:underline" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Fermer" : "Régler"}
        </button>
        <button
          className="text-xs text-red-600 hover:underline"
          onClick={async () => {
            if (!confirm(`Déconnecter ${c.name} ?`)) return;
            await postJson("/api/mcp", { id: c.id }, "DELETE");
            onChange();
          }}
        >
          Déconnecter
        </button>
      </div>
      {expanded && (
        <div className="mt-3 space-y-3 border-t pt-3">
          <div>
            <div className="mb-1 text-xs text-gray-600">Agents qui peuvent l&apos;utiliser</div>
            <AgentPicker value={c.agents} onChange={(agents) => patch({ agents })} />
          </div>
          <div>
            <div className="mb-1 flex items-center text-xs text-gray-600">
              Actions permises
              <button
                disabled={busy}
                className="ml-auto text-slate-600 hover:underline"
                onClick={async () => {
                  setBusy(true);
                  await postJson("/api/mcp", { id: c.id });
                  setBusy(false);
                  onChange();
                }}
              >
                {busy ? "Test…" : "↻ Tester et actualiser"}
              </button>
            </div>
            {!tools.length && <p className="text-xs text-gray-500">Aucune action listée. Testez la connexion pour actualiser.</p>}
            <ul className="max-h-56 space-y-1 overflow-y-auto">
              {tools.map((t) => {
                const on = !c.disabled_tools.includes(t.name);
                return (
                  <li key={t.name}>
                    <label className="flex cursor-pointer items-start gap-2 rounded px-1 py-0.5 hover:bg-white">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={on}
                        onChange={() =>
                          patch({ disabled_tools: on ? [...c.disabled_tools, t.name] : c.disabled_tools.filter((x) => x !== t.name) })
                        }
                      />
                      <span className="min-w-0">
                        <span className="font-mono text-xs">{t.name}</span>{" "}
                        {t.readOnly ? (
                          <span className="rounded bg-sky-100 px-1 text-[10px] text-sky-800">lecture</span>
                        ) : t.destructive ? (
                          <span className="rounded bg-red-100 px-1 text-[10px] text-red-700">destructive</span>
                        ) : (
                          <span className="rounded bg-amber-100 px-1 text-[10px] text-amber-800">modifie</span>
                        )}
                        {t.description && <span className="block truncate text-xs text-gray-500">{t.description}</span>}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </li>
  );
}
