"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { AGENTS, AGENT_BY_ID } from "@/lib/agents";
import { usd, usePoll } from "./shared";
import Today from "./Today";
import ComptaPanel from "./Compta";
import Team from "./Team";
import { RecurringModal, UsageModal } from "./Settings";
import ConnectionsModal from "./Connections";
import SectorPanel from "./Sector";
import { SECTORS, SECTOR_BY_ID, type SectorId } from "@/lib/sector-info";

const Office3D = dynamic(() => import("./Office3D"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-sm text-gray-500">
      Chargement du bureau 3D…
    </div>
  ),
});

type Task = {
  id: number;
  agent_id: string;
  instruction: string;
  status: "queued" | "running" | "done" | "error";
  result: string | null;
  parent_task_id: number | null;
  created_at: string;
  cost_usd: number;
};
type Log = {
  id: number;
  kind: "message" | "tool" | "result" | "error";
  content: string;
  created_at: string;
};
type Email = {
  id: number;
  direction: "in" | "out";
  status: "received" | "draft" | "sent" | "failed";
  from_addr: string | null;
  to_addr: string | null;
  subject: string;
  body: string;
  agent_id: string | null;
  created_at: string;
};
type Transaction = {
  id: number;
  date: string;
  label: string;
  category: string;
  amount: number;
  vat_rate: number;
};
type Prospect = {
  id: number;
  company: string;
  contact: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  notes: string | null;
  status: string;
};
type FileInfo = { name: string; size: number; modified: string };
type State = {
  tasks: Task[];
  working: string[];
  aiConfigured: boolean;
  smtpConfigured: boolean;
  connections: { provider: string; account_email: string }[];
  mcpCount: number;
  sector: SectorId;
  monthSpend: number;
  budget: number;
};
type Data = {
  emails: Email[];
  transactions: Transaction[];
  prospects: Prospect[];
  files: FileInfo[];
};

const STATUS_LABEL: Record<Task["status"], string> = {
  queued: "en attente",
  running: "en cours",
  done: "terminée",
  error: "erreur",
};
const STATUS_COLOR: Record<Task["status"], string> = {
  queued: "bg-gray-100 text-gray-700",
  running: "bg-amber-100 text-amber-800",
  done: "bg-emerald-100 text-emerald-800",
  error: "bg-red-100 text-red-800",
};

type Me = { name: string; email: string; role: "owner" | "member" };

export default function Dashboard({
  me,
  orgName,
}: {
  me: Me;
  orgName: string;
}) {
  const isOwner = me.role === "owner";
  const [state, reloadState] = usePoll<State>("/api/state", 2000);
  const [data, reloadData] = usePoll<Data>("/api/data", 4000);
  const [selectedAgent, setSelectedAgent] = useState<string>("direction");
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  type Tab =
    | "today"
    | "activite"
    | "mails"
    | "compta"
    | "equipe"
    | "prospects"
    | "fichiers" | "metier";
  const [tab, setTab] = useState<Tab>("today");
  const [showUsage, setShowUsage] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [showCompany, setShowCompany] = useState(false);
  const [showConnections, setShowConnections] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  // Retour de la page de connexion Google : on affiche le résultat puis on nettoie l'adresse.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const connected = q.get("connected");
    const error = q.get("connect_error");
    if (!connected && !error) return;
    setNotice(
      connected
        ? {
            ok: true,
            text: `Compte ${connected} connecté : vos agents peuvent maintenant l'utiliser.`,
          }
        : { ok: false, text: `Connexion impossible : ${error}` },
    );
    setShowConnections(true);
    window.history.replaceState(null, "", "/");
  }, []);

  const refresh = () => {
    reloadState();
    reloadData();
  };

  // Une tâche lancée depuis un bouton (« Demander à Inès »…) : on montre l'agent et son suivi en direct.
  const onAsked = (taskId: number, agentId: string) => {
    setSelectedAgent(agentId);
    setSelectedTask(taskId);
    refresh();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(ellipse_at_top_left,#eef2ff_0%,#f8fafc_45%,#f1f5f9_100%)] text-slate-900">
      <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-slate-200/70 bg-white/80 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-400 text-lg text-white shadow-md shadow-fuchsia-500/20">
            ✦
          </span>
          <div className="leading-tight">
            <div className="text-[15px] font-bold tracking-tight">Bureau IA</div>
            <div className="text-xs text-slate-500">{orgName}</div>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-1.5 text-xs">
          <span
            className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 font-medium sm:inline-flex ${
              state?.aiConfigured ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            }`}
            title={state?.aiConfigured ? "Clé API Claude configurée" : "Ajoutez ANTHROPIC_API_KEY dans .env.local"}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${state?.aiConfigured ? "bg-emerald-500" : "bg-amber-500"}`} />
            {state?.aiConfigured ? "IA connectée" : "Clé API manquante"}
          </span>
          <HeaderButton onClick={() => setShowUsage(true)} icon="💰">
            {state ? usd(state.monthSpend) : "…"}
            {state?.budget ? <span className="text-slate-400"> / {usd(state.budget)}</span> : null}
          </HeaderButton>
          <HeaderButton onClick={() => setShowRecurring(true)} icon="⏰">
            <span className="hidden md:inline">Automatisations</span>
          </HeaderButton>
          {isOwner && (
            <HeaderButton onClick={() => setShowConnections(true)} icon="🔌">
              <span className="hidden md:inline">Connexions</span>
              {state && (
                <span
                  className={`rounded-full px-1.5 text-[10px] font-semibold ${
                    state.connections.length + state.mcpCount ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {state.connections.length + state.mcpCount}
                </span>
              )}
            </HeaderButton>
          )}
          <HeaderButton onClick={() => setShowCompany(true)} icon="⚙️">
            <span className="hidden md:inline">Entreprise</span>
          </HeaderButton>
          <UserMenu me={me} />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[1fr_420px]">
        <div className="relative h-[55vh] overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80 lg:h-[64vh]">
          <Office3D
            working={state?.working ?? []}
            links={delegationLinks(state?.tasks ?? [])}
            selected={selectedAgent}
            onSelect={(id) => {
              setSelectedAgent(id);
              setSelectedTask(null);
            }}
          />
          <OfficeOverlay working={state?.working.length ?? 0} />
        </div>

        <AgentPanel
          sector={state?.sector ?? "general"}
          agentId={selectedAgent}
          working={state?.working ?? []}
          onSelectAgent={(id) => {
            setSelectedAgent(id);
            setSelectedTask(null);
          }}
          tasks={(state?.tasks ?? []).filter((t) => t.agent_id === selectedAgent)}
          selectedTask={selectedTask}
          onSelectTask={setSelectedTask}
          onCreated={(id) => {
            setSelectedTask(id);
            refresh();
          }}
        />
      </div>

      <section className="mx-4 mb-6 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
        <nav className="flex gap-1 overflow-x-auto border-b border-slate-100 p-2 text-sm">
          {(
            [
              ["today", "🏠 Aujourd'hui"],
              ["activite", "📋 Activité"],
              ["mails", `✉️ Mails${countDrafts(data)}`],
              ...(state && SECTOR_BY_ID[state.sector]?.tab ? [["metier", SECTOR_BY_ID[state.sector].tab!] as const] : []),
              ["compta", "💶 Compta & TVA"],
              ["equipe", "👥 Équipe & planning"],
              ["prospects", `🎯 Prospects (${data?.prospects.length ?? 0})`],
              ["fichiers", `📁 Fichiers (${data?.files.length ?? 0})`],
            ] as readonly (readonly [Tab, string])[]
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`shrink-0 whitespace-nowrap rounded-xl px-3.5 py-2 transition-colors ${
                tab === k ? "bg-slate-900 font-semibold text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="p-4">
          {tab === "activite" && (
            <Activity
              tasks={state?.tasks ?? []}
              onOpen={(t) => {
                setSelectedAgent(t.agent_id);
                setSelectedTask(t.id);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          )}
          {tab === "mails" && (
            <Mails emails={data?.emails ?? []} onChange={refresh} />
          )}
          {tab === "today" && <Today onAsked={onAsked} goTo={setTab} />}
          {tab === "compta" && (
            <ComptaPanel
              transactions={data?.transactions ?? []}
              onAsked={onAsked}
            />
          )}
          {tab === "equipe" && <Team onAsked={onAsked} />}
          {tab === "metier" && <SectorPanel onAsked={onAsked} />}
          {tab === "prospects" && (
            <Prospects prospects={data?.prospects ?? []} />
          )}
          {tab === "fichiers" && <Files files={data?.files ?? []} />}
        </div>
      </section>

      {showCompany && (
        <CompanyModal isOwner={isOwner} onClose={() => setShowCompany(false)} />
      )}
      {showUsage && (
        <UsageModal
          onClose={() => {
            setShowUsage(false);
            refresh();
          }}
        />
      )}
      {showRecurring && (
        <RecurringModal onClose={() => setShowRecurring(false)} />
      )}
      {showConnections && (
        <ConnectionsModal
          notice={notice}
          onClose={() => {
            setShowConnections(false);
            setNotice(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

/** Délégations en cours : [agent parent, agent qui exécute] pour les sous-tâches actives. */
function delegationLinks(tasks: Task[]): [string, string][] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const out = new Map<string, [string, string]>();
  for (const t of tasks) {
    if (t.parent_task_id === null || (t.status !== "running" && t.status !== "queued")) continue;
    const parent = byId.get(t.parent_task_id);
    if (parent && parent.agent_id !== t.agent_id) out.set(`${parent.agent_id}-${t.agent_id}`, [parent.agent_id, t.agent_id]);
  }
  return [...out.values()];
}

function countDrafts(data: Data | null) {
  const n = data?.emails.filter((e) => e.status === "draft").length ?? 0;
  return n ? ` (${n} à valider)` : "";
}

function HeaderButton({ onClick, icon, children }: { onClick: () => void; icon: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 transition hover:bg-slate-100"
    >
      <span>{icon}</span>
      {children}
    </button>
  );
}

/** Bandeau en surimpression sur le bureau 3D : activité et heure. */
function OfficeOverlay({ working }: { working: number }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return (
    <>
      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-black/5 backdrop-blur">
          <span className={`h-2 w-2 rounded-full ${working ? "animate-pulse bg-amber-500" : "bg-emerald-500"}`} />
          {working ? `${working} agent${working > 1 ? "s" : ""} au travail` : "Toute l'équipe est disponible"}
        </span>
        <span className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium tabular-nums text-slate-600 shadow-sm ring-1 ring-black/5 backdrop-blur">
          {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/75 px-3 py-1 text-[11px] text-slate-500 shadow-sm ring-1 ring-black/5 backdrop-blur">
        <span className="sm:hidden">Touchez un agent pour lui confier une tâche</span>
        <span className="hidden sm:inline">Cliquez sur un agent pour lui confier une tâche · glissez pour tourner · molette pour zoomer</span>
      </div>
    </>
  );
}


function AgentPanel({
  sector,
  agentId,
  working,
  onSelectAgent,
  tasks,
  selectedTask,
  onSelectTask,
  onCreated,
}: {
  sector: SectorId;
  agentId: string;
  working: string[];
  onSelectAgent: (id: string) => void;
  tasks: Task[];
  selectedTask: number | null;
  onSelectTask: (id: number | null) => void;
  onCreated: (id: number) => void;
}) {
  const agent = AGENT_BY_ID[agentId];
  const [instruction, setInstruction] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!instruction.trim()) return;
    setSending(true);
    setError(null);
    const r = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, instruction }),
    });
    const d = await r.json();
    setSending(false);
    if (!r.ok) return setError(d.error ?? "Erreur");
    setInstruction("");
    onCreated(d.id);
  };

  return (
    <aside className="flex max-h-[64vh] min-h-[420px] flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
      <div className="flex gap-1.5 overflow-x-auto border-b border-slate-100 px-3 py-2.5">
        {AGENTS.map((a) => {
          const active = a.id === agentId;
          return (
            <button
              key={a.id}
              onClick={() => onSelectAgent(a.id)}
              title={`${a.name} · ${a.role}`}
              className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold text-white transition ${
                active ? "scale-110 ring-2 ring-offset-2" : "opacity-60 hover:opacity-100"
              }`}
              style={{ background: a.color, ...(active ? ({ "--tw-ring-color": a.color } as React.CSSProperties) : {}) }}
              aria-label={a.name}
            >
              {a.name[0]}
              {working.includes(a.id) && (
                <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-white bg-amber-500" />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="relative border-b border-slate-100 p-4">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-20 opacity-[0.12]"
          style={{ background: `linear-gradient(180deg, ${agent.color}, transparent)` }}
        />
        <div className="relative flex items-center gap-3">
          <span
            className="grid h-12 w-12 place-items-center rounded-2xl text-lg font-bold text-white shadow-md"
            style={{ background: `linear-gradient(135deg, ${agent.color}, ${agent.color}cc)` }}
          >
            {agent.name[0]}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-semibold">
              {agent.name}
              {working.includes(agentId) ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">au travail</span>
              ) : (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">disponible</span>
              )}
            </div>
            <div className="text-xs text-slate-500">{agent.role}</div>
          </div>
        </div>
        <div className="relative mt-3 rounded-xl border border-slate-200 bg-white focus-within:ring-2" style={{ "--tw-ring-color": `${agent.color}55` } as React.CSSProperties}>
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            placeholder={`Que doit faire ${agent.name} ?`}
            rows={3}
            className="w-full resize-none rounded-xl bg-transparent p-3 text-sm outline-none"
          />
          <div className="flex items-center gap-2 px-2 pb-2">
            <span className="text-[11px] text-slate-400">Ctrl+Entrée</span>
            {error && <span className="text-xs text-red-600">{error}</span>}
            <button
              onClick={submit}
              disabled={sending || !instruction.trim()}
              className="ml-auto rounded-lg px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition disabled:opacity-40"
              style={{ background: agent.color }}
            >
              {sending ? "Envoi…" : "Confier la tâche →"}
            </button>
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {[...(SECTOR_BY_ID[sector]?.examples[agentId] ?? []), ...agent.examples].slice(0, 4).map((ex) => (
            <button
              key={ex}
              onClick={() => setInstruction(ex)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-left text-[11px] leading-snug text-slate-600 transition hover:border-slate-300 hover:bg-white"
            >
              ✨ {ex}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {selectedTask ? (
          <TaskDetail id={selectedTask} onBack={() => onSelectTask(null)} />
        ) : (
          <ul className="divide-y">
            {tasks.length === 0 && (
              <li className="p-4 text-sm text-gray-500">
                Aucune tâche pour l&apos;instant.
              </li>
            )}
            {tasks.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => onSelectTask(t.id)}
                  className="w-full p-3 text-left hover:bg-gray-50"
                >
                  <TaskLine t={t} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

function TaskLine({ t, showAgent }: { t: Task; showAgent?: boolean }) {
  const a = AGENT_BY_ID[t.agent_id];
  return (
    <div className="flex items-start gap-2">
      <span
        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLOR[t.status]}`}
      >
        {STATUS_LABEL[t.status]}
      </span>
      <div className="min-w-0 text-sm">
        {showAgent && (
          <span className="mr-1 font-semibold" style={{ color: a?.color }}>
            {a?.name}
          </span>
        )}
        {t.parent_task_id && (
          <span className="mr-1 text-xs text-gray-400">↳ délégué</span>
        )}
        <span className="line-clamp-2">{t.instruction}</span>
      </div>
      {t.cost_usd > 0 && (
        <span
          className="ml-auto shrink-0 text-[11px] text-gray-400"
          title="Coût IA de cette tâche"
        >
          {usd(t.cost_usd)}
        </span>
      )}
    </div>
  );
}

function TaskDetail({ id, onBack }: { id: number; onBack: () => void }) {
  const [d] = usePoll<{ task: Task; logs: Log[] }>(`/api/tasks/${id}`, 1500);
  if (!d) return <div className="p-4 text-sm text-gray-500">Chargement…</div>;
  return (
    <div className="p-3">
      <button
        onClick={onBack}
        className="mb-2 text-xs text-gray-500 hover:underline"
      >
        ← Toutes les tâches
      </button>
      <TaskLine t={d.task} />
      <ol className="mt-3 space-y-2">
        {d.logs.map((l) => (
          <li
            key={l.id}
            className={`whitespace-pre-wrap rounded-md p-2 text-xs ${
              l.kind === "tool"
                ? "bg-slate-50 font-mono text-gray-500"
                : l.kind === "error"
                  ? "bg-red-50 text-red-700"
                  : l.kind === "result"
                    ? "bg-emerald-50"
                    : "bg-white ring-1 ring-gray-100"
            }`}
          >
            {l.kind === "tool" ? "⚙️ " + l.content : l.content}
          </li>
        ))}
        {(d.task.status === "running" || d.task.status === "queued") && (
          <li className="animate-pulse text-xs text-gray-400">
            L&apos;agent travaille…
          </li>
        )}
      </ol>
    </div>
  );
}

function Activity({
  tasks,
  onOpen,
}: {
  tasks: Task[];
  onOpen: (t: Task) => void;
}) {
  if (!tasks.length)
    return (
      <p className="text-sm text-gray-500">
        Rien pour l&apos;instant : cliquez sur un agent et confiez-lui une
        tâche.
      </p>
    );
  return (
    <ul className="divide-y">
      {tasks.map((t) => (
        <li key={t.id}>
          <button
            onClick={() => onOpen(t)}
            className="w-full py-2 text-left hover:bg-gray-50"
          >
            <TaskLine t={t} showAgent />
          </button>
        </li>
      ))}
    </ul>
  );
}

function Mails({
  emails,
  onChange,
}: {
  emails: Email[];
  onChange: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const drafts = emails.filter((e) => e.status === "draft");
  const others = emails.filter((e) => e.status !== "draft");
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">
          Brouillons à valider ({drafts.length})
        </h3>
        <button
          onClick={() => setAdding((v) => !v)}
          className="ml-auto rounded-md border px-3 py-1 text-sm hover:bg-gray-50"
        >
          + Ajouter un mail reçu
        </button>
      </div>
      {adding && (
        <IncomingForm
          onDone={() => {
            setAdding(false);
            onChange();
          }}
        />
      )}
      {drafts.length === 0 && (
        <p className="text-sm text-gray-500">Aucun brouillon.</p>
      )}
      {drafts.map((e) => (
        <DraftCard key={e.id} email={e} onChange={onChange} />
      ))}
      <h3 className="pt-2 font-semibold">Historique</h3>
      <ul className="divide-y text-sm">
        {others.map((e) => (
          <li key={e.id} className="py-2">
            <details>
              <summary className="cursor-pointer">
                <span className="mr-2 text-xs text-gray-500">
                  {e.status === "received"
                    ? "📥 reçu de " + (e.from_addr || "?")
                    : "📤 envoyé à " + e.to_addr}
                </span>
                {e.subject}
              </summary>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-gray-700">
                {e.body}
              </pre>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

function IncomingForm({ onDone }: { onDone: () => void }) {
  const [from, setFrom] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  return (
    <div className="space-y-2 rounded-md border bg-slate-50 p-3 text-sm">
      <p className="text-xs text-gray-500">
        Collez un mail reçu : Léa pourra ensuite y répondre.
      </p>
      <input
        className="w-full rounded border p-2"
        placeholder="Expéditeur"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
      />
      <input
        className="w-full rounded border p-2"
        placeholder="Objet"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
      />
      <textarea
        className="w-full rounded border p-2"
        rows={4}
        placeholder="Contenu"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <button
        className="rounded-md bg-slate-800 px-3 py-1.5 text-white"
        onClick={async () => {
          await fetch("/api/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ from, subject, body }),
          });
          onDone();
        }}
      >
        Ajouter
      </button>
    </div>
  );
}

function DraftCard({
  email,
  onChange,
}: {
  email: Email;
  onChange: () => void;
}) {
  const [to, setTo] = useState(email.to_addr ?? "");
  const [subject, setSubject] = useState(email.subject);
  const [body, setBody] = useState(email.body);
  const [msg, setMsg] = useState<string | null>(null);
  const a = email.agent_id ? AGENT_BY_ID[email.agent_id] : null;
  return (
    <div className="space-y-2 rounded-md border p-3 text-sm">
      <div className="text-xs text-gray-500">Rédigé par {a?.name ?? "?"}</div>
      <input
        className="w-full rounded border p-2"
        placeholder="Destinataire"
        value={to}
        onChange={(e) => setTo(e.target.value)}
      />
      <input
        className="w-full rounded border p-2 font-semibold"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
      />
      <textarea
        className="w-full rounded border p-2"
        rows={6}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <button
          className="rounded-md bg-emerald-600 px-3 py-1.5 font-semibold text-white"
          onClick={async () => {
            setMsg("Envoi…");
            const r = await fetch(`/api/emails/${email.id}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ to, subject, body }),
            });
            const d = await r.json();
            setMsg(r.ok ? "Envoyé ✓" : d.error);
            if (r.ok) onChange();
          }}
        >
          Valider et envoyer
        </button>
        <button
          className="rounded-md border px-3 py-1.5"
          onClick={() =>
            navigator.clipboard
              .writeText(`${subject}\n\n${body}`)
              .then(() => setMsg("Copié"))
          }
        >
          Copier
        </button>
        <button
          className="rounded-md px-3 py-1.5 text-red-600 hover:bg-red-50"
          onClick={async () => {
            await fetch(`/api/emails/${email.id}`, { method: "DELETE" });
            onChange();
          }}
        >
          Supprimer
        </button>
        {msg && <span className="text-xs text-gray-600">{msg}</span>}
      </div>
    </div>
  );
}

function Prospects({ prospects }: { prospects: Prospect[] }) {
  if (!prospects.length)
    return (
      <p className="text-sm text-gray-500">
        CRM vide. Demandez à Sami de trouver des prospects.
      </p>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-gray-500">
          <tr>
            <th className="p-1">Entreprise</th>
            <th className="p-1">Contact</th>
            <th className="p-1">Email / tél.</th>
            <th className="p-1">Statut</th>
            <th className="p-1">Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {prospects.map((p) => (
            <tr key={p.id} className="align-top">
              <td className="p-1 font-medium">
                {p.website ? (
                  <a
                    className="underline"
                    href={p.website}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {p.company}
                  </a>
                ) : (
                  p.company
                )}
              </td>
              <td className="p-1">{p.contact}</td>
              <td className="p-1">
                {[p.email, p.phone].filter(Boolean).join(" · ")}
              </td>
              <td className="p-1">
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                  {p.status}
                </span>
              </td>
              <td className="p-1 text-xs text-gray-600">{p.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Files({ files }: { files: FileInfo[] }) {
  if (!files.length)
    return (
      <p className="text-sm text-gray-500">
        Aucun fichier. Les agents y déposeront leurs documents.
      </p>
    );
  return (
    <ul className="divide-y text-sm">
      {files.map((f) => (
        <li key={f.name} className="flex items-center gap-3 py-2">
          <a
            className="font-medium underline"
            href={`/api/files/${encodeURIComponent(f.name)}`}
            target="_blank"
            rel="noreferrer"
          >
            {f.name}
          </a>
          <span className="text-xs text-gray-500">
            {(f.size / 1024).toFixed(1)} Ko
          </span>
          <span className="ml-auto text-xs text-gray-400">
            {new Date(f.modified).toLocaleString("fr-FR")}
          </span>
        </li>
      ))}
    </ul>
  );
}

function UserMenu({ me }: { me: Me }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="grid h-8 w-8 place-items-center rounded-full bg-slate-800 text-xs font-semibold text-white"
        title={me.email}
        aria-label="Mon compte"
      >
        {me.name.slice(0, 1).toUpperCase()}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-56 rounded-lg border bg-white p-3 text-sm shadow-lg">
          <div className="font-medium">{me.name}</div>
          <div className="truncate text-xs text-gray-500">{me.email}</div>
          <div className="mt-1 text-xs text-gray-400">
            {me.role === "owner" ? "Propriétaire" : "Membre"}
          </div>
          <button
            className="mt-3 w-full rounded-md border px-3 py-1.5 text-left hover:bg-gray-50"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            }}
          >
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}

type Member = { id: number; name: string; email: string; role: string };

function Members({ isOwner }: { isOwner: boolean }) {
  const [d, setD] = useState<{
    members: Member[];
    me: { id: number } | null;
  } | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = () =>
    fetch("/api/auth/members")
      .then((r) => r.json())
      .then(setD);
  useEffect(() => {
    load();
  }, []);
  return (
    <div className="mt-5 border-t pt-4">
      <h3 className="text-sm font-semibold">Membres du compte</h3>
      <ul className="mt-2 divide-y text-sm">
        {d?.members.map((m) => (
          <li key={m.id} className="flex items-center gap-2 py-1.5">
            <span className="font-medium">{m.name}</span>
            <span className="truncate text-xs text-gray-500">{m.email}</span>
            <span className="ml-auto text-xs text-gray-400">
              {m.role === "owner" ? "propriétaire" : "membre"}
            </span>
            {isOwner && m.id !== d.me?.id && (
              <button
                className="text-xs text-red-600 hover:underline"
                onClick={async () => {
                  if (!confirm(`Retirer ${m.name} du compte ?`)) return;
                  const r = await fetch("/api/auth/members", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: m.id }),
                  });
                  if (!r.ok) setErr((await r.json()).error);
                  load();
                }}
              >
                Retirer
              </button>
            )}
          </li>
        ))}
      </ul>
      {isOwner && (
        <div className="mt-2">
          <button
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
            onClick={async () => {
              setErr(null);
              const r = await fetch("/api/auth/invite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: "{}",
              });
              const j = await r.json();
              if (r.ok) setLink(j.url);
              else setErr(j.error);
            }}
          >
            + Inviter un collègue
          </button>
          {link && (
            <div className="mt-2 rounded-md bg-slate-50 p-2 text-xs">
              Envoyez ce lien (valable 7 jours, une seule utilisation) :
              <div className="mt-1 flex gap-2">
                <input
                  readOnly
                  value={link}
                  className="flex-1 rounded border bg-white p-1 font-mono"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  className="rounded border px-2"
                  onClick={() => navigator.clipboard.writeText(link)}
                >
                  Copier
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
    </div>
  );
}

function SectorPicker() {
  const [sector, setSector] = useState<SectorId | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    fetch("/api/sector").then((r) => r.json()).then((d) => setSector(d.sector));
  }, []);
  if (!sector) return null;
  return (
    <div className="mt-5 border-t pt-4">
      <h3 className="text-sm font-semibold">Métier</h3>
      <p className="text-xs text-gray-500">Active un onglet dédié, et adapte les outils et les conseils des agents.</p>
      <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
        {SECTORS.map((x) => (
          <button
            key={x.id}
            onClick={async () => {
              await fetch("/api/sector", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "set_sector", sector: x.id }),
              });
              setSector(x.id);
              setSaved(true);
              setTimeout(() => setSaved(false), 1500);
            }}
            className={`rounded-md border px-2 py-1.5 text-left text-sm ${sector === x.id ? "border-slate-800 bg-slate-800 text-white" : "hover:bg-gray-50"}`}
          >
            {x.emoji} {x.label}
          </button>
        ))}
      </div>
      {saved && <p className="mt-1 text-xs text-emerald-700">Métier enregistré ✓</p>}
    </div>
  );
}

function CompanyModal({
  onClose,
  isOwner,
}: {
  onClose: () => void;
  isOwner: boolean;
}) {
  const [profile, setProfile] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/company")
      .then((r) => r.json())
      .then((d) => setProfile(d.profile));
  }, []);
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-semibold">Profil de l&apos;entreprise</h2>
        <p className="mb-2 text-xs text-gray-500">
          Tous les agents lisent ce profil avant chaque tâche. Plus il est
          précis, meilleur est leur travail.
        </p>
        <textarea
          className="h-64 w-full rounded border p-2 text-sm"
          value={profile ?? "Chargement…"}
          onChange={(e) => setProfile(e.target.value)}
        />
        <div className="mt-2 flex justify-end gap-2">
          {isOwner && (
            <button
              className="mr-auto text-xs text-red-600 hover:underline"
              onClick={async () => {
                if (
                  !confirm(
                    "Effacer toutes les données du bureau (tâches, mails, compta, factures, équipe, fichiers) ? Cette action est définitive.",
                  )
                )
                  return;
                await fetch("/api/demo", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "reset" }),
                });
                window.location.reload();
              }}
            >
              Tout effacer
            </button>
          )}
          <button
            className="rounded-md border px-3 py-1.5 text-sm"
            onClick={onClose}
          >
            Annuler
          </button>
          <button
            className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-white"
            onClick={async () => {
              await fetch("/api/company", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ profile }),
              });
              onClose();
            }}
          >
            Enregistrer
          </button>
        </div>
        {isOwner && <SectorPicker />}
        <Members isOwner={isOwner} />
      </div>
    </div>
  );
}
