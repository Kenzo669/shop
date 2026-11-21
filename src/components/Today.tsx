"use client";

import { useState } from "react";
import { AskButton, Stat, eur, postJson, usd, usePoll } from "./shared";

type TodayData = {
  today: string;
  vat: {
    label: string;
    from: string;
    to: string;
    deadline: string;
    estimate: number;
  } | null;
  overdue: {
    id: number;
    number: string;
    client: string;
    total_ttc: number;
    due_date: string;
  }[];
  unpaidTotal: number;
  drafts: number;
  planning: {
    employees: number;
    nextWeekMissing: boolean;
    nextMonday: string;
    alerts: { employee: string; message: string }[];
  };
  upcomingLeaves: {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    type: string;
  }[];
  month: { recettes: number; depenses: number };
  ai: { spent: number; budget: number };
};

const fr = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });

/** Page d'accueil : ce qui demande l'attention de l'entrepreneur aujourd'hui. Aucun appel à l'IA. */
export default function Today({
  onAsked,
  goTo,
}: {
  onAsked: (taskId: number, agentId: string) => void;
  goTo: (tab: "mails" | "compta" | "equipe") => void;
}) {
  const [d] = usePoll<TodayData>("/api/today", 10000);
  if (!d) return <p className="text-sm text-gray-500">Chargement…</p>;

  const todo: {
    icon: string;
    title: string;
    detail: string;
    action?: React.ReactNode;
    tone: "red" | "amber" | "blue";
  }[] = [];
  if (d.drafts)
    todo.push({
      icon: "✉️",
      title: `${d.drafts} mail${d.drafts > 1 ? "s" : ""} à valider`,
      detail:
        "Vos agents ont préparé des brouillons : relisez-les avant envoi.",
      action: (
        <button
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
          onClick={() => goTo("mails")}
        >
          Voir les mails
        </button>
      ),
      tone: "blue",
    });
  if (d.overdue.length)
    todo.push({
      icon: "⏰",
      title: `${d.overdue.length} facture${d.overdue.length > 1 ? "s" : ""} en retard (${eur(d.overdue.reduce((t, i) => t + i.total_ttc, 0))})`,
      detail: d.overdue
        .map((i) => `${i.number} — ${i.client}, échue le ${fr(i.due_date)}`)
        .join(" · "),
      action: (
        <AskButton
          agentId="compta"
          label="Faire relancer par Marc"
          instruction="Prépare un mail de relance courtois et personnalisé (en brouillon) pour chaque facture en retard, en rappelant le numéro, le montant et la date d'échéance."
          onAsked={onAsked}
        />
      ),
      tone: "red",
    });
  if (d.vat)
    todo.push({
      icon: "🧾",
      title: `${d.vat.label} : environ ${eur(d.vat.estimate)} à payer`,
      detail: `À déclarer ${d.vat.deadline}. Montant estimé à partir de votre journal.`,
      action: (
        <button
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
          onClick={() => goTo("compta")}
        >
          Préparer la déclaration
        </button>
      ),
      tone: "amber",
    });
  if (d.planning.nextWeekMissing)
    todo.push({
      icon: "📅",
      title: "Planning de la semaine prochaine à faire",
      detail: `Aucun créneau pour la semaine du ${fr(d.planning.nextMonday)}.`,
      action: (
        <AskButton
          agentId="rh"
          label="Demander à Inès"
          instruction={`Fais le planning de la semaine du ${d.planning.nextMonday} en respectant les contrats, les absences et les contraintes notées sur les fiches des employés. Corrige toutes les alertes.`}
          onAsked={onAsked}
        />
      ),
      tone: "amber",
    });
  if (d.planning.alerts.length)
    todo.push({
      icon: "⚠️",
      title: `${d.planning.alerts.length} alerte${d.planning.alerts.length > 1 ? "s" : ""} sur le planning de cette semaine`,
      detail: d.planning.alerts
        .map((a) => `${a.employee} : ${a.message}`)
        .join(" · "),
      action: (
        <button
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
          onClick={() => goTo("equipe")}
        >
          Voir le planning
        </button>
      ),
      tone: "red",
    });

  const toneClass = {
    red: "border-l-red-500",
    amber: "border-l-amber-500",
    blue: "border-l-sky-500",
  };
  const aiPct = d.ai.budget
    ? Math.min(100, (d.ai.spent / d.ai.budget) * 100)
    : 0;

  return (
    <>
      <Welcome />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div>
          <h3 className="mb-2 font-semibold">
            À faire{" "}
            {todo.length > 0 && (
              <span className="text-sm font-normal text-gray-500">
                ({todo.length})
              </span>
            )}
          </h3>
          {todo.length === 0 && (
            <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
              ✓ Rien d&apos;urgent. Tout est à jour.
            </div>
          )}
          <ul className="space-y-2">
            {todo.map((t) => (
              <li
                key={t.title}
                className={`flex flex-wrap items-center gap-3 rounded-lg border border-l-4 p-3 ${toneClass[t.tone]}`}
              >
                <span className="text-xl">{t.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-gray-500">{t.detail}</div>
                </div>
                {t.action}
              </li>
            ))}
          </ul>
          {d.upcomingLeaves.length > 0 && (
            <>
              <h3 className="mb-2 mt-5 font-semibold">Absences à venir</h3>
              <ul className="text-sm text-gray-700">
                {d.upcomingLeaves.map((l) => (
                  <li key={l.id}>
                    🌴 {l.name} — {l.type} du {fr(l.start_date)} au{" "}
                    {fr(l.end_date)}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold">Ce mois-ci</h3>
          <div className="grid grid-cols-2 gap-2">
            <Stat
              label="Recettes TTC"
              value={eur(d.month.recettes)}
              tone="good"
            />
            <Stat label="Dépenses TTC" value={eur(d.month.depenses)} />
            <Stat
              label="Factures non payées"
              value={eur(d.unpaidTotal)}
              tone={d.overdue.length ? "bad" : undefined}
            />
            <Stat label="Employés" value={String(d.planning.employees)} />
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="flex text-xs text-gray-500">
              <span>Consommation IA</span>
              <span className="ml-auto">
                {d.ai.budget ? `budget ${usd(d.ai.budget)}` : "sans plafond"}
              </span>
            </div>
            <div className="text-lg font-semibold">{usd(d.ai.spent)}</div>
            {d.ai.budget > 0 && (
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full ${aiPct >= 100 ? "bg-red-500" : aiPct >= 80 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${aiPct}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/** Carte de bienvenue tant que le bureau est vide : étapes de démarrage et données d'exemple. */
function Welcome() {
  const [d, reload] = usePoll<{ empty: boolean }>("/api/demo", 15000);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!d?.empty) return null;
  return (
    <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm">
      <div className="text-base font-semibold">
        👋 Bienvenue dans votre bureau
      </div>
      <ol className="mt-2 list-inside list-decimal space-y-1 text-gray-700">
        <li>
          Décrivez votre entreprise dans <strong>⚙️ Entreprise</strong>{" "}
          (tous les agents le lisent).
        </li>
        <li>
          Ajoutez vos employés dans <strong>👥 Équipe & planning</strong>, vos
          factures dans <strong>💶 Compta & TVA</strong>.
        </li>
        <li>Cliquez sur un agent dans le bureau et confiez-lui une tâche.</li>
      </ol>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          disabled={busy}
          className="rounded-md bg-sky-700 px-3 py-1.5 font-semibold text-white hover:bg-sky-800 disabled:opacity-50"
          onClick={async () => {
            setBusy(true);
            try {
              await postJson("/api/demo", { action: "load" });
              window.location.reload();
            } catch (e) {
              setErr(e instanceof Error ? e.message : String(e));
              setBusy(false);
              reload();
            }
          }}
        >
          {busy ? "Chargement…" : "Découvrir avec des données d'exemple"}
        </button>
        <span className="text-xs text-gray-500">
          Une entreprise fictive pour tout essayer. Aucun coût IA. Effaçable
          ensuite depuis ⚙️ Entreprise.
        </span>
        {err && <span className="text-xs text-red-600">{err}</span>}
      </div>
    </div>
  );
}
