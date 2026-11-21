"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { AGENTS, AGENT_BY_ID } from "@/lib/agents";
import { usd, usePoll } from "./shared";
import Today from "./Today";
import ComptaPanel from "./Compta";
import Team from "./Team";
import { RecurringModal, UsageModal } from "./Settings";

const Office3D = dynamic(() => import("./Office3D"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-gray-500">Chargement du bureau 3D…</div>,
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
type Log = { id: number; kind: "message" | "tool" | "result" | "error"; content: string; created_at: string };
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
type Transaction = { id: number; date: string; label: string; category: string; amount: number; vat_rate: number };
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
  monthSpend: number;
  budget: number;
};
type Data = { emails: Email[]; transactions: Transaction[]; prospects: Prospect[]; files: FileInfo[] };

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



export default function Dashboard() {
  const [state, reloadState] = usePoll<State>("/api/state", 2000);
  const [data, reloadData] = usePoll<Data>("/api/data", 4000);
  const [selectedAgent, setSelectedAgent] = useState<string>("direction");
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  type Tab = "today" | "activite" | "mails" | "compta" | "equipe" | "prospects" | "fichiers";
  const [tab, setTab] = useState<Tab>("today");
  const [showUsage, setShowUsage] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [showCompany, setShowCompany] = useState(false);
  const [showConnections, setShowConnections] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  // Retour de la page de connexion Google : on affiche le résultat puis on nettoie l'adresse.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const connected = q.get("connected");
    const error = q.get("connect_error");
    if (!connected && !error) return;
    setNotice(
      connected
        ? { ok: true, text: `Compte ${connected} connecté : vos agents peuvent maintenant l'utiliser.` }
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
    <div className="flex min-h-screen flex-col bg-slate-100 text-gray-900">
      <header className="flex flex-wrap items-center gap-3 border-b bg-white px-4 py-3">
        <div className="text-lg font-bold">🏢 Bureau IA</div>
        <div className="text-sm text-gray-500">Votre équipe d&apos;agents IA, au travail.</div>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
          <Badge ok={state?.aiConfigured} okText="IA connectée" koText="Clé API Claude manquante" />
          <button onClick={() => setShowUsage(true)} className="rounded-md border px-3 py-1.5 hover:bg-gray-50">
            💰 {state ? usd(state.monthSpend) : "…"}
            {state?.budget ? <span className="text-gray-400"> / {usd(state.budget)}</span> : null}
          </button>
          <button onClick={() => setShowRecurring(true)} className="rounded-md border px-3 py-1.5 hover:bg-gray-50">
            ⏰ Automatisations
          </button>
          <button
            onClick={() => setShowConnections(true)}
            className="rounded-md border px-3 py-1.5 hover:bg-gray-50"
          >
            🔌 Connexions
            {state && (
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                  state.connections.length ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"
                }`}
              >
                {state.connections.length}
              </span>
            )}
          </button>
          <button onClick={() => setShowCompany(true)} className="rounded-md border px-3 py-1.5 hover:bg-gray-50">
            ⚙️ Profil entreprise
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 p-3 lg:grid-cols-[1fr_420px]">
        <div className="relative h-[55vh] overflow-hidden rounded-xl border bg-white lg:h-[62vh]">
          <Office3D
            working={state?.working ?? []}
            selected={selectedAgent}
            onSelect={(id) => {
              setSelectedAgent(id);
              setSelectedTask(null);
            }}
          />
          <div className="pointer-events-none absolute bottom-2 left-3 text-xs text-gray-500">
            Cliquez sur un agent pour lui confier une tâche · glissez pour tourner la vue
          </div>
        </div>

        <AgentPanel
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

      <section className="mx-3 mb-3 rounded-xl border bg-white">
        <nav className="flex flex-wrap gap-1 border-b px-2 pt-2 text-sm">
          {(
            [
              ["today", "🏠 Aujourd'hui"],
              ["activite", "📋 Activité"],
              ["mails", `✉️ Mails${countDrafts(data)}`],
              ["compta", "💶 Compta & TVA"],
              ["equipe", "👥 Équipe & planning"],
              ["prospects", `🎯 Prospects (${data?.prospects.length ?? 0})`],
              ["fichiers", `📁 Fichiers (${data?.files.length ?? 0})`],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-t-md px-3 py-2 ${tab === k ? "bg-slate-100 font-semibold" : "text-gray-600 hover:bg-gray-50"}`}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="p-3">
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
          {tab === "mails" && <Mails emails={data?.emails ?? []} onChange={refresh} />}
          {tab === "today" && <Today onAsked={onAsked} goTo={setTab} />}
          {tab === "compta" && <ComptaPanel transactions={data?.transactions ?? []} onAsked={onAsked} />}
          {tab === "equipe" && <Team onAsked={onAsked} />}
          {tab === "prospects" && <Prospects prospects={data?.prospects ?? []} />}
          {tab === "fichiers" && <Files files={data?.files ?? []} />}
        </div>
      </section>

      {showCompany && <CompanyModal onClose={() => setShowCompany(false)} />}
      {showUsage && <UsageModal onClose={() => { setShowUsage(false); refresh(); }} />}
      {showRecurring && <RecurringModal onClose={() => setShowRecurring(false)} />}
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

function countDrafts(data: Data | null) {
  const n = data?.emails.filter((e) => e.status === "draft").length ?? 0;
  return n ? ` (${n} à valider)` : "";
}

function Badge({ ok, okText, koText }: { ok?: boolean; okText: string; koText: string }) {
  if (ok === undefined) return null;
  return (
    <span className={`rounded-full px-2.5 py-1 ${ok ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
      {ok ? "● " + okText : "○ " + koText}
    </span>
  );
}

function AgentPanel({
  agentId,
  working,
  onSelectAgent,
  tasks,
  selectedTask,
  onSelectTask,
  onCreated,
}: {
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
    <aside className="flex max-h-[62vh] min-h-[400px] flex-col overflow-hidden rounded-xl border bg-white">
      <div className="flex gap-1 overflow-x-auto border-b p-2">
        {AGENTS.map((a) => (
          <button
            key={a.id}
            onClick={() => onSelectAgent(a.id)}
            title={`${a.name} · ${a.role}`}
            className={`relative shrink-0 rounded-full px-2.5 py-1 text-xs ${a.id === agentId ? "font-semibold text-white" : "bg-slate-100 text-gray-700"}`}
            style={a.id === agentId ? { background: a.color } : undefined}
          >
            {a.name}
            {working.includes(a.id) && <span className="ml-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400 align-middle" />}
          </button>
        ))}
      </div>
      <div className="border-b p-4" style={{ borderTop: `4px solid ${agent.color}` }}>
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full text-white" style={{ background: agent.color }}>
            {agent.name[0]}
          </span>
          <div>
            <div className="font-semibold">{agent.name}</div>
            <div className="text-xs text-gray-500">{agent.role}</div>
          </div>
        </div>
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          placeholder={`Que doit faire ${agent.name} ?`}
          rows={3}
          className="mt-3 w-full resize-none rounded-md border p-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
        />
        <div className="mt-2 flex flex-wrap gap-1">
          {agent.examples.map((ex) => (
            <button
              key={ex}
              onClick={() => setInstruction(ex)}
              className="rounded-full bg-slate-100 px-2 py-1 text-left text-[11px] text-gray-700 hover:bg-slate-200"
            >
              {ex}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={submit}
            disabled={sending || !instruction.trim()}
            className="rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: agent.color }}
          >
            {sending ? "Envoi…" : "Confier la tâche"}
          </button>
          <span className="text-[11px] text-gray-400">Ctrl+Entrée</span>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {selectedTask ? (
          <TaskDetail id={selectedTask} onBack={() => onSelectTask(null)} />
        ) : (
          <ul className="divide-y">
            {tasks.length === 0 && <li className="p-4 text-sm text-gray-500">Aucune tâche pour l&apos;instant.</li>}
            {tasks.map((t) => (
              <li key={t.id}>
                <button onClick={() => onSelectTask(t.id)} className="w-full p-3 text-left hover:bg-gray-50">
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
      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLOR[t.status]}`}>
        {STATUS_LABEL[t.status]}
      </span>
      <div className="min-w-0 text-sm">
        {showAgent && (
          <span className="mr-1 font-semibold" style={{ color: a?.color }}>
            {a?.name}
          </span>
        )}
        {t.parent_task_id && <span className="mr-1 text-xs text-gray-400">↳ délégué</span>}
        <span className="line-clamp-2">{t.instruction}</span>
      </div>
      {t.cost_usd > 0 && (
        <span className="ml-auto shrink-0 text-[11px] text-gray-400" title="Coût IA de cette tâche">
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
      <button onClick={onBack} className="mb-2 text-xs text-gray-500 hover:underline">
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
          <li className="animate-pulse text-xs text-gray-400">L&apos;agent travaille…</li>
        )}
      </ol>
    </div>
  );
}

function Activity({ tasks, onOpen }: { tasks: Task[]; onOpen: (t: Task) => void }) {
  if (!tasks.length) return <p className="text-sm text-gray-500">Rien pour l&apos;instant : cliquez sur un agent et confiez-lui une tâche.</p>;
  return (
    <ul className="divide-y">
      {tasks.map((t) => (
        <li key={t.id}>
          <button onClick={() => onOpen(t)} className="w-full py-2 text-left hover:bg-gray-50">
            <TaskLine t={t} showAgent />
          </button>
        </li>
      ))}
    </ul>
  );
}

function Mails({ emails, onChange }: { emails: Email[]; onChange: () => void }) {
  const [adding, setAdding] = useState(false);
  const drafts = emails.filter((e) => e.status === "draft");
  const others = emails.filter((e) => e.status !== "draft");
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">Brouillons à valider ({drafts.length})</h3>
        <button onClick={() => setAdding((v) => !v)} className="ml-auto rounded-md border px-3 py-1 text-sm hover:bg-gray-50">
          + Ajouter un mail reçu
        </button>
      </div>
      {adding && <IncomingForm onDone={() => { setAdding(false); onChange(); }} />}
      {drafts.length === 0 && <p className="text-sm text-gray-500">Aucun brouillon.</p>}
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
                  {e.status === "received" ? "📥 reçu de " + (e.from_addr || "?") : "📤 envoyé à " + e.to_addr}
                </span>
                {e.subject}
              </summary>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-gray-700">{e.body}</pre>
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
      <p className="text-xs text-gray-500">Collez un mail reçu : Léa pourra ensuite y répondre.</p>
      <input className="w-full rounded border p-2" placeholder="Expéditeur" value={from} onChange={(e) => setFrom(e.target.value)} />
      <input className="w-full rounded border p-2" placeholder="Objet" value={subject} onChange={(e) => setSubject(e.target.value)} />
      <textarea className="w-full rounded border p-2" rows={4} placeholder="Contenu" value={body} onChange={(e) => setBody(e.target.value)} />
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

function DraftCard({ email, onChange }: { email: Email; onChange: () => void }) {
  const [to, setTo] = useState(email.to_addr ?? "");
  const [subject, setSubject] = useState(email.subject);
  const [body, setBody] = useState(email.body);
  const [msg, setMsg] = useState<string | null>(null);
  const a = email.agent_id ? AGENT_BY_ID[email.agent_id] : null;
  return (
    <div className="space-y-2 rounded-md border p-3 text-sm">
      <div className="text-xs text-gray-500">Rédigé par {a?.name ?? "?"}</div>
      <input className="w-full rounded border p-2" placeholder="Destinataire" value={to} onChange={(e) => setTo(e.target.value)} />
      <input className="w-full rounded border p-2 font-semibold" value={subject} onChange={(e) => setSubject(e.target.value)} />
      <textarea className="w-full rounded border p-2" rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
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
          onClick={() => navigator.clipboard.writeText(`${subject}\n\n${body}`).then(() => setMsg("Copié"))}
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
  if (!prospects.length) return <p className="text-sm text-gray-500">CRM vide. Demandez à Sami de trouver des prospects.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-gray-500">
          <tr><th className="p-1">Entreprise</th><th className="p-1">Contact</th><th className="p-1">Email / tél.</th><th className="p-1">Statut</th><th className="p-1">Notes</th></tr>
        </thead>
        <tbody className="divide-y">
          {prospects.map((p) => (
            <tr key={p.id} className="align-top">
              <td className="p-1 font-medium">
                {p.website ? <a className="underline" href={p.website} target="_blank" rel="noreferrer">{p.company}</a> : p.company}
              </td>
              <td className="p-1">{p.contact}</td>
              <td className="p-1">{[p.email, p.phone].filter(Boolean).join(" · ")}</td>
              <td className="p-1"><span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{p.status}</span></td>
              <td className="p-1 text-xs text-gray-600">{p.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Files({ files }: { files: FileInfo[] }) {
  if (!files.length) return <p className="text-sm text-gray-500">Aucun fichier. Les agents y déposeront leurs documents.</p>;
  return (
    <ul className="divide-y text-sm">
      {files.map((f) => (
        <li key={f.name} className="flex items-center gap-3 py-2">
          <a className="font-medium underline" href={`/api/files/${encodeURIComponent(f.name)}`} target="_blank" rel="noreferrer">
            {f.name}
          </a>
          <span className="text-xs text-gray-500">{(f.size / 1024).toFixed(1)} Ko</span>
          <span className="ml-auto text-xs text-gray-400">{new Date(f.modified).toLocaleString("fr-FR")}</span>
        </li>
      ))}
    </ul>
  );
}

type ConnectionsData = {
  connections: { id: number; provider: string; account_email: string; created_at: string }[];
  available: { google: boolean };
};

// Logiciels proposés à la connexion. Seul Google est branché pour l'instant.
const PROVIDERS: { id: string; name: string; logo: string; desc: string; agents: string; soon?: boolean }[] = [
  { id: "google", name: "Google", logo: "G", desc: "Gmail et Google Agenda", agents: "Léa, Nora" },
  { id: "microsoft", name: "Microsoft 365", logo: "M", desc: "Outlook et Calendrier", agents: "Léa, Nora", soon: true },
  { id: "linkedin", name: "LinkedIn", logo: "in", desc: "Publication de posts", agents: "Chloé", soon: true },
  { id: "hubspot", name: "HubSpot", logo: "H", desc: "CRM et contacts", agents: "Sami", soon: true },
  { id: "pennylane", name: "Pennylane", logo: "P", desc: "Comptabilité et factures", agents: "Marc", soon: true },
  { id: "slack", name: "Slack", logo: "#", desc: "Messagerie d'équipe", agents: "Nora", soon: true },
];

function ConnectionsModal({ notice, onClose }: { notice: { ok: boolean; text: string } | null; onClose: () => void }) {
  const [data, setData] = useState<ConnectionsData | null>(null);
  const load = useCallback(() => {
    fetch("/api/connections").then((r) => r.json()).then(setData);
  }, []);
  useEffect(load, [load]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start">
          <div>
            <h2 className="text-lg font-semibold">Connexions</h2>
            <p className="text-sm text-gray-500">
              Reliez vos comptes : vos agents travaillent directement dans vos outils.
            </p>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-700" aria-label="Fermer">
            ✕
          </button>
        </div>

        {notice && (
          <div className={`mt-3 rounded-md p-2 text-sm ${notice.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
            {notice.text}
          </div>
        )}

        <ul className="mt-4 space-y-2">
          {PROVIDERS.map((p) => {
            const accounts = data?.connections.filter((c) => c.provider === p.id) ?? [];
            const configured = p.id === "google" ? data?.available.google : false;
            return (
              <li key={p.id} className="rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-slate-100 text-sm font-bold text-slate-700">
                    {p.logo}
                  </span>
                  <div className="min-w-0">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-gray-500">
                      {p.desc} · utilisé par {p.agents}
                    </div>
                  </div>
                  <div className="ml-auto shrink-0">
                    {p.soon ? (
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500">Bientôt</span>
                    ) : (
                      <a
                        href="/api/connect/google"
                        className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                          configured ? "bg-slate-800 text-white hover:bg-slate-700" : "pointer-events-none bg-gray-100 text-gray-400"
                        }`}
                      >
                        {accounts.length ? "Ajouter un compte" : "Connecter"}
                      </a>
                    )}
                  </div>
                </div>
                {!p.soon && data && !configured && (
                  <p className="mt-2 text-xs text-amber-700">
                    À configurer par l&apos;administrateur : GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET (voir README).
                  </p>
                )}
                {accounts.map((a) => (
                  <div key={a.id} className="mt-2 flex items-center gap-2 rounded-md bg-emerald-50 px-2 py-1.5 text-sm">
                    <span className="text-emerald-700">● Connecté</span>
                    <span className="truncate">{a.account_email}</span>
                    <button
                      className="ml-auto text-xs text-red-600 hover:underline"
                      onClick={async () => {
                        if (!confirm(`Déconnecter ${a.account_email} ?`)) return;
                        await fetch(`/api/connections/${a.id}`, { method: "DELETE" });
                        load();
                      }}
                    >
                      Déconnecter
                    </button>
                  </div>
                ))}
              </li>
            );
          })}
        </ul>

        <p className="mt-4 text-xs text-gray-500">
          🔒 Vos accès sont chiffrés et ne sont jamais montrés à l&apos;IA. Aucun mail n&apos;est envoyé sans votre
          validation, et vous pouvez déconnecter un compte à tout moment.
        </p>
      </div>
    </div>
  );
}

function CompanyModal({ onClose }: { onClose: () => void }) {
  const [profile, setProfile] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/company").then((r) => r.json()).then((d) => setProfile(d.profile));
  }, []);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-semibold">Profil de l&apos;entreprise</h2>
        <p className="mb-2 text-xs text-gray-500">Tous les agents lisent ce profil avant chaque tâche. Plus il est précis, meilleur est leur travail.</p>
        <textarea
          className="h-64 w-full rounded border p-2 text-sm"
          value={profile ?? "Chargement…"}
          onChange={(e) => setProfile(e.target.value)}
        />
        <div className="mt-2 flex justify-end gap-2">
          <button
            className="mr-auto text-xs text-red-600 hover:underline"
            onClick={async () => {
              if (!confirm("Effacer toutes les données du bureau (tâches, mails, compta, factures, équipe, fichiers) ? Cette action est définitive.")) return;
              await fetch("/api/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reset" }) });
              window.location.reload();
            }}
          >
            Tout effacer
          </button>
          <button className="rounded-md border px-3 py-1.5 text-sm" onClick={onClose}>Annuler</button>
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
      </div>
    </div>
  );
}
