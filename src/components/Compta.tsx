"use client";

import { useState } from "react";
import { AskButton, Stat, eur, postJson, usePoll } from "./shared";

type Transaction = { id: number; date: string; label: string; category: string; amount: number; vat_rate: number };
type Invoice = {
  id: number;
  number: string;
  client: string;
  issue_date: string;
  due_date: string;
  total_ht: number;
  total_ttc: number;
  status: "brouillon" | "envoyée" | "payée" | "annulée";
  paid_date: string | null;
  file: string | null;
  en_retard: boolean;
};
type VatLine = number | { base: number; tva: number };
type VatData = {
  regime: "mensuel" | "trimestriel" | "franchise";
  next: { label: string; from: string; to: string; deadline: string } | null;
  result: { ca3: Record<string, VatLine>; a_payer: number; credit: number; nb_ecritures: number; avertissement: string } | null;
};

const fr = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("fr-FR");

export default function Compta({
  transactions,
  onAsked,
}: {
  transactions: Transaction[];
  onAsked: (taskId: number, agentId: string) => void;
}) {
  const [sub, setSub] = useState<"journal" | "factures" | "tva">("journal");
  return (
    <div>
      <div className="mb-3 inline-flex rounded-lg bg-slate-100 p-1 text-sm">
        {(
          [
            ["journal", "Journal"],
            ["factures", "Factures"],
            ["tva", "Déclaration de TVA"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setSub(k)}
            className={`rounded-md px-3 py-1 ${sub === k ? "bg-white font-semibold shadow-sm" : "text-gray-600"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {sub === "journal" && <Journal transactions={transactions} />}
      {sub === "factures" && <Invoices onAsked={onAsked} />}
      {sub === "tva" && <Vat onAsked={onAsked} />}
    </div>
  );
}

function Journal({ transactions }: { transactions: Transaction[] }) {
  const recettes = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const depenses = transactions.filter((t) => t.amount < 0).reduce((s, t) => s - t.amount, 0);
  return (
    <div>
      <div className="mb-3 grid grid-cols-3 gap-2 text-sm">
        <Stat label="Recettes TTC" value={eur(recettes)} tone="good" />
        <Stat label="Dépenses TTC" value={eur(depenses)} />
        <Stat label="Résultat" value={eur(recettes - depenses)} />
      </div>
      {transactions.length === 0 ? (
        <p className="text-sm text-gray-500">Aucune écriture. Demandez à Marc d&apos;en enregistrer.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-gray-500">
              <tr>
                <th className="p-1">Date</th>
                <th className="p-1">Libellé</th>
                <th className="p-1">Catégorie</th>
                <th className="p-1 text-right">Montant TTC</th>
                <th className="p-1 text-right">TVA</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td className="p-1">{fr(t.date)}</td>
                  <td className="p-1">{t.label}</td>
                  <td className="p-1">{t.category}</td>
                  <td className={`p-1 text-right ${t.amount < 0 ? "text-red-600" : "text-emerald-700"}`}>{eur(t.amount)}</td>
                  <td className="p-1 text-right">{t.vat_rate} %</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const STATUS_STYLE: Record<Invoice["status"], string> = {
  brouillon: "bg-gray-100 text-gray-700",
  envoyée: "bg-sky-100 text-sky-800",
  payée: "bg-emerald-100 text-emerald-800",
  annulée: "bg-gray-100 text-gray-400 line-through",
};

function Invoices({ onAsked }: { onAsked: (taskId: number, agentId: string) => void }) {
  const [data, reload] = usePoll<{ invoices: Invoice[] }>("/api/invoices", 5000);
  const [creating, setCreating] = useState(false);
  const invoices = data?.invoices ?? [];
  const late = invoices.filter((i) => i.en_retard);
  const waiting = invoices.filter((i) => i.status === "envoyée");
  return (
    <div>
      <div className="mb-3 grid grid-cols-3 gap-2 text-sm">
        <Stat label="En attente de paiement" value={eur(waiting.reduce((t, i) => t + i.total_ttc, 0))} />
        <Stat label="Dont en retard" value={eur(late.reduce((t, i) => t + i.total_ttc, 0))} tone={late.length ? "bad" : undefined} />
        <Stat
          label="Encaissé ce mois"
          value={eur(
            invoices
              .filter((i) => i.status === "payée" && i.paid_date?.slice(0, 7) === new Date().toISOString().slice(0, 7))
              .reduce((t, i) => t + i.total_ttc, 0),
          )}
          tone="good"
        />
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <button className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-semibold text-white" onClick={() => setCreating((v) => !v)}>
          + Nouvelle facture
        </button>
        {late.length > 0 && (
          <AskButton
            agentId="compta"
            label={`Faire relancer les ${late.length} facture(s) en retard`}
            className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100"
            instruction="Prépare un mail de relance courtois et personnalisé (en brouillon) pour chaque facture en retard, en rappelant le numéro, le montant et la date d'échéance."
            onAsked={onAsked}
          />
        )}
      </div>
      {creating && (
        <InvoiceForm
          onDone={() => {
            setCreating(false);
            reload();
          }}
        />
      )}
      {invoices.length === 0 ? (
        <p className="text-sm text-gray-500">Aucune facture. Créez-en une ou demandez à Marc.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-gray-500">
              <tr>
                <th className="p-1">N°</th>
                <th className="p-1">Client</th>
                <th className="p-1">Émise</th>
                <th className="p-1">Échéance</th>
                <th className="p-1 text-right">TTC</th>
                <th className="p-1">Statut</th>
                <th className="p-1"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoices.map((i) => (
                <tr key={i.id} className={i.en_retard ? "bg-red-50/60" : ""}>
                  <td className="p-1 font-medium">
                    {i.file ? (
                      <a className="underline" href={`/api/files/${encodeURIComponent(i.file)}`} target="_blank" rel="noreferrer">
                        {i.number}
                      </a>
                    ) : (
                      i.number
                    )}
                  </td>
                  <td className="p-1">{i.client}</td>
                  <td className="p-1">{fr(i.issue_date)}</td>
                  <td className={`p-1 ${i.en_retard ? "font-semibold text-red-600" : ""}`}>{fr(i.due_date)}</td>
                  <td className="p-1 text-right">{eur(i.total_ttc)}</td>
                  <td className="p-1">
                    <span className={`rounded px-1.5 py-0.5 text-xs ${i.en_retard ? "bg-red-100 text-red-700" : STATUS_STYLE[i.status]}`}>
                      {i.en_retard ? "en retard" : i.status}
                    </span>
                  </td>
                  <td className="p-1 text-right">
                    {i.status === "envoyée" && (
                      <button
                        className="rounded border px-2 py-0.5 text-xs hover:bg-emerald-50"
                        onClick={async () => {
                          await postJson(`/api/invoices/${i.id}`, { action: "paid" });
                          reload();
                        }}
                      >
                        ✓ Payée
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-gray-500">Marquer une facture payée enregistre automatiquement la recette dans le journal.</p>
    </div>
  );
}

function InvoiceForm({ onDone }: { onDone: () => void }) {
  const [client, setClient] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [dueDays, setDueDays] = useState(30);
  const [lines, setLines] = useState([{ label: "", qty: 1, unit_price_ht: 0, vat_rate: 20 }]);
  const [err, setErr] = useState<string | null>(null);
  const ht = lines.reduce((t, l) => t + l.qty * l.unit_price_ht, 0);
  const ttc = lines.reduce((t, l) => t + l.qty * l.unit_price_ht * (1 + l.vat_rate / 100), 0);
  const set = (i: number, patch: Partial<(typeof lines)[number]>) =>
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  return (
    <div className="mb-4 space-y-2 rounded-lg border bg-slate-50 p-3 text-sm">
      <div className="grid gap-2 sm:grid-cols-2">
        <input className="rounded border p-2" placeholder="Client *" value={client} onChange={(e) => setClient(e.target.value)} />
        <input className="rounded border p-2" placeholder="Email du client" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="rounded border p-2 sm:col-span-2" placeholder="Adresse du client" value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      {lines.map((l, i) => (
        <div key={i} className="grid grid-cols-[1fr_70px_110px_90px] gap-2">
          <input className="rounded border p-2" placeholder="Désignation" value={l.label} onChange={(e) => set(i, { label: e.target.value })} />
          <input className="rounded border p-2" type="number" min={0} step="any" value={l.qty} onChange={(e) => set(i, { qty: Number(e.target.value) })} aria-label="Quantité" />
          <input className="rounded border p-2" type="number" min={0} step="any" value={l.unit_price_ht} onChange={(e) => set(i, { unit_price_ht: Number(e.target.value) })} aria-label="Prix unitaire HT" />
          <select className="rounded border p-2" value={l.vat_rate} onChange={(e) => set(i, { vat_rate: Number(e.target.value) })} aria-label="TVA">
            {[20, 10, 5.5, 2.1, 0].map((r) => (
              <option key={r} value={r}>
                {r} %
              </option>
            ))}
          </select>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <button className="text-xs text-slate-600 underline" onClick={() => setLines((ls) => [...ls, { label: "", qty: 1, unit_price_ht: 0, vat_rate: 20 }])}>
          + ajouter une ligne
        </button>
        <label className="text-xs text-gray-600">
          Paiement à{" "}
          <input className="w-14 rounded border p-1" type="number" value={dueDays} onChange={(e) => setDueDays(Number(e.target.value))} /> jours
        </label>
        <span className="ml-auto text-gray-600">
          {eur(ht)} HT · <strong>{eur(ttc)} TTC</strong>
        </span>
        <button
          className="rounded-md bg-emerald-600 px-3 py-1.5 font-semibold text-white"
          onClick={async () => {
            try {
              await postJson("/api/invoices", { client, client_email: email, client_address: address, due_days: dueDays, lines });
              onDone();
            } catch (e) {
              setErr(e instanceof Error ? e.message : String(e));
            }
          }}
        >
          Créer la facture
        </button>
      </div>
      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  );
}

function Vat({ onAsked }: { onAsked: (taskId: number, agentId: string) => void }) {
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const url = range ? `/api/vat?from=${range.from}&to=${range.to}` : "/api/vat";
  const [d, reload] = usePoll<VatData>(url, 15000);
  if (!d) return <p className="text-sm text-gray-500">Chargement…</p>;
  const from = range?.from ?? d.next?.from ?? "";
  const to = range?.to ?? d.next?.to ?? "";
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col text-xs text-gray-600">
          Régime de TVA
          <select
            className="mt-1 rounded border p-1.5 text-sm"
            value={d.regime}
            onChange={async (e) => {
              await postJson("/api/vat", { regime: e.target.value }, "PUT");
              setRange(null);
              reload();
            }}
          >
            <option value="mensuel">Réel normal — mensuel</option>
            <option value="trimestriel">Trimestriel</option>
            <option value="franchise">Franchise en base (pas de TVA)</option>
          </select>
        </label>
        {d.regime !== "franchise" && (
          <>
            <label className="flex flex-col text-xs text-gray-600">
              Du
              <input type="date" className="mt-1 rounded border p-1.5 text-sm" value={from} onChange={(e) => setRange({ from: e.target.value, to })} />
            </label>
            <label className="flex flex-col text-xs text-gray-600">
              Au
              <input type="date" className="mt-1 rounded border p-1.5 text-sm" value={to} onChange={(e) => setRange({ from, to: e.target.value })} />
            </label>
          </>
        )}
      </div>

      {d.regime === "franchise" ? (
        <p className="rounded-md bg-slate-50 p-3 text-sm">
          En franchise en base, vous ne facturez pas de TVA et n&apos;avez pas de déclaration à faire. Les factures portent la mention
          « TVA non applicable, art. 293 B du CGI ».
        </p>
      ) : (
        d.result && (
          <>
            {d.next && !range && (
              <p className="text-sm text-gray-600">
                📅 Prochaine déclaration : <strong>{d.next.label}</strong>, à déposer {d.next.deadline}.
              </p>
            )}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Stat label="TVA nette à payer" value={eur(d.result.a_payer)} tone={d.result.a_payer ? "warn" : undefined} />
              <Stat label="Crédit de TVA" value={eur(d.result.credit)} tone={d.result.credit ? "good" : undefined} />
              <Stat label="Écritures prises en compte" value={String(d.result.nb_ecritures)} />
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-gray-500">
                  <tr>
                    <th className="p-2">Ligne du formulaire CA3</th>
                    <th className="p-2 text-right">Base HT</th>
                    <th className="p-2 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {Object.entries(d.result.ca3).map(([k, v]) => (
                    <tr key={k} className={/^(16|23|28)/.test(k) ? "font-semibold" : ""}>
                      <td className="p-2">{k}</td>
                      <td className="p-2 text-right text-gray-500">{typeof v === "object" ? eur(v.base) : ""}</td>
                      <td className="p-2 text-right">{eur(typeof v === "object" ? v.tva : v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-amber-700">⚠️ {d.result.avertissement}</p>
            <AskButton
              agentId="compta"
              label="Faire vérifier et préparer le récapitulatif par Marc"
              instruction={`Prépare ma déclaration de TVA du ${from} au ${to} : utilise vat_return, vérifie les écritures inhabituelles (taux, catégories, doublons), puis enregistre un récapitulatif clair en HTML imprimable avec les montants à reporter ligne par ligne sur impots.gouv.fr.`}
              onAsked={onAsked}
            />
          </>
        )
      )}
    </div>
  );
}
