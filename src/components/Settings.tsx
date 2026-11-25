"use client";

import { useEffect, useState } from "react";
import { AGENTS, AGENT_BY_ID } from "@/lib/agents";
import { Modal, Stat, postJson, usd, usePoll } from "./shared";

type Effort = "low" | "medium" | "high";
type UsageData = {
  totals: { cost: number; input: number; output: number; cache_read: number; cache_write: number; searches: number; tasks: number };
  byAgent: { agent_id: string; cost: number; tasks: number }[];
  byModel: { model: string; cost: number }[];
  byDay: { day: string; cost: number }[];
  topTasks: { id: number; agent_id: string; instruction: string; cost_usd: number; model: string | null }[];
  budget: number;
  taskCap: number;
  monthSpend: number;
  agents: Record<string, { model: string; effort: Effort }>;
  assistant: { model: string; effort: Effort };
  models: { id: string; label: string; input: number; output: number }[];
};

const tokens = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)} M` : n >= 1e3 ? `${Math.round(n / 1e3)} k` : String(n));

export function UsageModal({ onClose }: { onClose: () => void }) {
  const [d, reload] = usePoll<UsageData>("/api/usage", 10000);
  const [budget, setBudget] = useState<number | null>(null);
  const [cap, setCap] = useState<number | null>(null);
  const [agents, setAgents] = useState<UsageData["agents"] | null>(null);
  const [assistant, setAssistant] = useState<UsageData["assistant"] | null>(null);
  const [saved, setSaved] = useState(false);

  // Initialise le formulaire une seule fois, au premier chargement.
  useEffect(() => {
    if (d && agents === null) {
      setBudget(d.budget);
      setCap(d.taskCap);
      setAgents(d.agents);
      setAssistant(d.assistant);
    }
  }, [d, agents]);

  if (!d || !agents) return <Modal title="Consommation IA" onClose={onClose}><p className="text-sm text-gray-500">Chargement…</p></Modal>;

  const pct = d.budget ? Math.min(100, (d.monthSpend / d.budget) * 100) : 0;
  const totalIn = d.totals.input + d.totals.cache_read + d.totals.cache_write;
  const cacheShare = totalIn ? Math.round((d.totals.cache_read / totalIn) * 100) : 0;
  const maxDay = Math.max(0.0001, ...d.byDay.map((x) => x.cost));

  return (
    <Modal title="Consommation IA" subtitle="Coût réel de chaque tâche, budget et modèle utilisé par chaque agent." onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Ce mois-ci" value={usd(d.monthSpend)} tone={pct >= 100 ? "bad" : pct >= 80 ? "warn" : undefined} />
        <Stat label="Tâches" value={String(d.totals.tasks)} />
        <Stat label="Coût moyen / tâche" value={usd(d.totals.tasks ? d.totals.cost / d.totals.tasks : 0)} />
        <Stat label="Lu depuis le cache" value={`${cacheShare} %`} tone={cacheShare > 50 ? "good" : undefined} />
      </div>
      {d.budget > 0 && (
        <div className="mt-2">
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div className={`h-full ${pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {Math.round(pct)} % du budget de {usd(d.budget)}
            {pct >= 80 && pct < 100 && " — attention, le budget est bientôt atteint"}
            {pct >= 100 && " — budget atteint : les nouvelles tâches sont bloquées"}
          </div>
        </div>
      )}

      {d.byDay.length > 0 && (
        <div className="mt-4">
          <div className="mb-1 text-xs text-gray-500">30 derniers jours</div>
          <div className="flex h-16 items-end gap-0.5">
            {d.byDay.map((x) => (
              <div key={x.day} title={`${x.day} : ${usd(x.cost)}`} className="flex-1 rounded-t bg-slate-400" style={{ height: `${(x.cost / maxDay) * 100}%` }} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="mb-1 text-sm font-semibold">Par agent (ce mois)</h3>
          <ul className="text-sm">
            {d.byAgent.length === 0 && <li className="text-gray-500">Aucune tâche ce mois-ci.</li>}
            {d.byAgent.map((a) => (
              <li key={a.agent_id} className="flex border-b py-1">
                <span style={{ color: AGENT_BY_ID[a.agent_id]?.color ?? "#c026d3" }}>●</span>&nbsp;
                {AGENT_BY_ID[a.agent_id]?.name ?? (a.agent_id === "assistant" ? "Assistant (chat)" : a.agent_id)}
                <span className="ml-auto text-gray-500">{a.tasks} tâche(s) · {usd(a.cost)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-1 text-sm font-semibold">Tâches les plus coûteuses</h3>
          <ul className="text-sm">
            {d.topTasks.filter((t) => t.cost_usd > 0).map((t) => (
              <li key={t.id} className="flex gap-2 border-b py-1">
                <span className="truncate">{t.instruction}</span>
                <span className="ml-auto shrink-0 text-gray-500">{usd(t.cost_usd)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-1 text-xs text-gray-400">
            Total : {tokens(totalIn)} tokens lus · {tokens(d.totals.output)} écrits · {d.totals.searches} recherches web
          </div>
        </div>
      </div>

      <h3 className="mb-1 mt-5 text-sm font-semibold">Réglages</h3>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          Budget mensuel
          <input type="number" min={0} step={5} className="w-24 rounded border p-1.5" value={budget ?? 0} onChange={(e) => setBudget(Number(e.target.value))} />$
          <span className="text-xs text-gray-400">(0 = sans plafond)</span>
        </label>
        <label className="flex items-center gap-2">
          Plafond par tâche
          <input type="number" min={0} step={0.5} className="w-20 rounded border p-1.5" value={cap ?? 0} onChange={(e) => setCap(Number(e.target.value))} />$
        </label>
      </div>
      <div className="mt-3 overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-gray-500">
            <tr>
              <th className="p-2">Agent</th>
              <th className="p-2">Modèle</th>
              <th className="p-2">Réflexion</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {AGENTS.map((a) => (
              <tr key={a.id}>
                <td className="p-2">
                  <span style={{ color: a.color }}>●</span> {a.name} <span className="text-xs text-gray-400">{a.role}</span>
                </td>
                <td className="p-2">
                  <select
                    className="rounded border p-1"
                    value={agents[a.id].model}
                    onChange={(e) => setAgents({ ...agents, [a.id]: { ...agents[a.id], model: e.target.value } })}
                  >
                    {d.models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label} ({m.input} $ / {m.output} $)
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <select
                    className="rounded border p-1"
                    value={agents[a.id].effort}
                    onChange={(e) => setAgents({ ...agents, [a.id]: { ...agents[a.id], effort: e.target.value as Effort } })}
                  >
                    <option value="low">Rapide</option>
                    <option value="medium">Normale</option>
                    <option value="high">Approfondie</option>
                  </select>
                </td>
              </tr>
            ))}
            {assistant && (
              <tr>
                <td className="p-2">
                  <span style={{ color: "#c026d3" }}>✦</span> Assistant <span className="text-xs text-gray-400">chat conseil</span>
                </td>
                <td className="p-2">
                  <select className="rounded border p-1" value={assistant.model} onChange={(e) => setAssistant({ ...assistant, model: e.target.value })}>
                    {d.models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label} ({m.input} $ / {m.output} $)
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <select className="rounded border p-1" value={assistant.effort} onChange={(e) => setAssistant({ ...assistant, effort: e.target.value as Effort })}>
                    <option value="low">Rapide</option>
                    <option value="medium">Normale</option>
                    <option value="high">Approfondie</option>
                  </select>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-xs text-gray-400">Prix par million de tokens (entrée / sortie). Haiku coûte environ 40 fois moins cher qu&apos;Opus en entrée.</p>
      <div className="mt-3 flex items-center gap-3">
        <button
          className="rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white"
          onClick={async () => {
            await postJson("/api/usage", { budget, taskCap: cap, agents, assistant }, "PUT");
            setSaved(true);
            reload();
            setTimeout(() => setSaved(false), 2000);
          }}
        >
          Enregistrer
        </button>
        {saved && <span className="text-sm text-emerald-700">Enregistré ✓</span>}
      </div>
    </Modal>
  );
}

type Recurring = {
  id: number;
  agent_id: string;
  instruction: string;
  frequency: "daily" | "weekly" | "monthly";
  weekday: number | null;
  monthday: number | null;
  hour: number;
  enabled: number;
  last_run: string | null;
};

const WEEKDAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

const SUGGESTIONS: { agent_id: string; instruction: string; frequency: Recurring["frequency"]; weekday?: number; monthday?: number; hour: number }[] = [
  { agent_id: "mail", instruction: "Lis les mails non lus d'hier et prépare les réponses en brouillon", frequency: "daily", hour: 8 },
  { agent_id: "compta", instruction: "Prépare les relances des factures en retard", frequency: "weekly", weekday: 1, hour: 9 },
  { agent_id: "rh", instruction: "Fais le planning de la semaine prochaine et corrige les alertes", frequency: "weekly", weekday: 4, hour: 10 },
  { agent_id: "compta", instruction: "Prépare la déclaration de TVA du mois dernier et un récapitulatif imprimable", frequency: "monthly", monthday: 5, hour: 9 },
  { agent_id: "direction", instruction: "Fais-moi un point hebdo : chiffre d'affaires, impayés, prospects et planning", frequency: "weekly", weekday: 5, hour: 17 },
];

const describe = (r: Pick<Recurring, "frequency" | "weekday" | "monthday" | "hour">) =>
  (r.frequency === "daily"
    ? "Chaque jour"
    : r.frequency === "weekly"
      ? `Chaque ${WEEKDAYS[(r.weekday ?? 1) - 1]}`
      : `Le ${r.monthday} de chaque mois`) + ` à ${r.hour} h`;

export function RecurringModal({ onClose }: { onClose: () => void }) {
  const [d, reload] = usePoll<{ recurring: Recurring[] }>("/api/recurring", 10000);
  const [f, setF] = useState({ agent_id: "mail", instruction: "", frequency: "weekly" as Recurring["frequency"], weekday: 1, monthday: 1, hour: 9 });
  const add = async (body: unknown) => {
    await postJson("/api/recurring", body);
    reload();
  };
  const list = d?.recurring ?? [];
  return (
    <Modal title="Automatisations" subtitle="Des tâches que vos agents font tout seuls, à intervalle régulier." onClose={onClose} wide>
      <ul className="space-y-2">
        {list.length === 0 && <li className="text-sm text-gray-500">Aucune automatisation pour l&apos;instant.</li>}
        {list.map((r) => {
          const a = AGENT_BY_ID[r.agent_id];
          return (
            <li key={r.id} className={`flex items-center gap-3 rounded-lg border p-3 text-sm ${r.enabled ? "" : "opacity-50"}`}>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white" style={{ background: a?.color }}>
                {a?.name[0]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate">{r.instruction}</div>
                <div className="text-xs text-gray-500">
                  {a?.name} · {describe(r)}
                  {r.last_run && ` · dernière fois le ${new Date(r.last_run).toLocaleDateString("fr-FR")}`}
                </div>
              </div>
              <button
                className="rounded border px-2 py-1 text-xs"
                onClick={async () => {
                  await postJson("/api/recurring", { id: r.id, enabled: !r.enabled }, "PATCH");
                  reload();
                }}
              >
                {r.enabled ? "Pause" : "Activer"}
              </button>
              <button
                className="text-xs text-red-600"
                onClick={async () => {
                  await postJson("/api/recurring", { id: r.id }, "DELETE");
                  reload();
                }}
              >
                Supprimer
              </button>
            </li>
          );
        })}
      </ul>

      <h3 className="mb-2 mt-5 text-sm font-semibold">Idées en un clic</h3>
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.filter((s) => !list.some((r) => r.instruction === s.instruction)).map((s) => (
          <button key={s.instruction} onClick={() => add(s)} className="rounded-full bg-slate-100 px-3 py-1.5 text-left text-xs hover:bg-slate-200">
            <strong>{AGENT_BY_ID[s.agent_id].name}</strong> · {describe({ ...s, weekday: s.weekday ?? null, monthday: s.monthday ?? null })} :{" "}
            {s.instruction}
          </button>
        ))}
      </div>

      <h3 className="mb-2 mt-5 text-sm font-semibold">Créer une automatisation</h3>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <select className="rounded border p-1.5" value={f.agent_id} onChange={(e) => setF({ ...f, agent_id: e.target.value })}>
          {AGENTS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.role})
            </option>
          ))}
        </select>
        <select className="rounded border p-1.5" value={f.frequency} onChange={(e) => setF({ ...f, frequency: e.target.value as Recurring["frequency"] })}>
          <option value="daily">Chaque jour</option>
          <option value="weekly">Chaque semaine</option>
          <option value="monthly">Chaque mois</option>
        </select>
        {f.frequency === "weekly" && (
          <select className="rounded border p-1.5" value={f.weekday} onChange={(e) => setF({ ...f, weekday: Number(e.target.value) })}>
            {WEEKDAYS.map((w, i) => (
              <option key={w} value={i + 1}>
                le {w}
              </option>
            ))}
          </select>
        )}
        {f.frequency === "monthly" && (
          <label>
            le <input type="number" min={1} max={28} className="w-14 rounded border p-1.5" value={f.monthday} onChange={(e) => setF({ ...f, monthday: Number(e.target.value) })} />
          </label>
        )}
        <label>
          à <input type="number" min={0} max={23} className="w-14 rounded border p-1.5" value={f.hour} onChange={(e) => setF({ ...f, hour: Number(e.target.value) })} /> h
        </label>
        <input
          className="min-w-64 flex-1 rounded border p-1.5"
          placeholder="Consigne, ex. « Fais le point sur les impayés »"
          value={f.instruction}
          onChange={(e) => setF({ ...f, instruction: e.target.value })}
        />
        <button
          className="rounded-md bg-slate-800 px-3 py-1.5 font-semibold text-white disabled:opacity-40"
          disabled={!f.instruction.trim()}
          onClick={async () => {
            await add(f);
            setF({ ...f, instruction: "" });
          }}
        >
          Ajouter
        </button>
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Les automatisations consomment des tokens comme une tâche normale et respectent le budget mensuel. Elles ne tournent
        que si le serveur est allumé.
      </p>
    </Modal>
  );
}
