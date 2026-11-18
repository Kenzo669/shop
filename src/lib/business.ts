// Fonctions de gestion « classiques » : calculs exacts, sans IA (donc sans coût en tokens).
// Les agents les utilisent comme outils, et l'interface les affiche directement.
import fs from "fs";
import path from "path";
import { db, FILES_DIR, getCompanyProfile, getSetting } from "./db";

const round = (n: number) => Math.round(n * 100) / 100;
const eur = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

// ---------------------------------------------------------------- TVA

export type VatRegime = "mensuel" | "trimestriel" | "franchise";
export const getVatRegime = () => getSetting<VatRegime>("vat_regime", "mensuel");

type Tx = { date: string; label: string; category: string; amount: number; vat_rate: number };

/**
 * Prépare les montants de la déclaration de TVA (formulaire CA3) à partir du journal,
 * en comptabilité d'encaissements : recettes = ventes encaissées, dépenses = achats payés (TTC).
 */
export function vatReturn(from: string, to: string) {
  const rows = db
    .prepare("SELECT date, label, category, amount, vat_rate FROM transactions WHERE date >= ? AND date <= ? ORDER BY date")
    .all(from, to) as Tx[];
  const sales: Record<string, { base: number; vat: number }> = {};
  let exempt = 0;
  let deductibleAssets = 0;
  let deductibleOther = 0;
  for (const r of rows) {
    const ht = r.amount / (1 + r.vat_rate / 100);
    const vat = r.amount - ht;
    if (r.amount >= 0) {
      if (r.vat_rate === 0) exempt += r.amount;
      else {
        const k = String(r.vat_rate);
        sales[k] ??= { base: 0, vat: 0 };
        sales[k].base += ht;
        sales[k].vat += vat;
      }
    } else if (/immobilisation/i.test(r.category)) deductibleAssets += -vat;
    else deductibleOther += -vat;
  }
  const line = (rate: number) => ({ base: round(sales[rate]?.base ?? 0), tva: round(sales[rate]?.vat ?? 0) });
  const collected = round(Object.values(sales).reduce((s, x) => s + x.vat, 0));
  const deductible = round(deductibleAssets + deductibleOther);
  const net = round(collected - deductible);
  return {
    periode: { du: from, au: to },
    nb_ecritures: rows.length,
    ca3: {
      "A1 — Ventes et prestations (HT)": round(Object.values(sales).reduce((s, x) => s + x.base, 0)),
      "E — Opérations non imposables": round(exempt),
      "08 — Taux normal 20 %": line(20),
      "9B — Taux réduit 10 %": line(10),
      "09 — Taux réduit 5,5 %": line(5.5),
      "Taux particulier 2,1 %": line(2.1),
      "16 — Total TVA brute due": collected,
      "19 — TVA déductible sur immobilisations": round(deductibleAssets),
      "20 — TVA déductible sur autres biens et services": round(deductibleOther),
      "23 — Total TVA déductible": deductible,
      "25 — Crédit de TVA": net < 0 ? -net : 0,
      "28 — TVA nette due": net > 0 ? net : 0,
    },
    a_payer: net > 0 ? net : 0,
    credit: net < 0 ? -net : 0,
    avertissement:
      "Montants préparés automatiquement à partir du journal (régime des encaissements). À vérifier avant de déclarer sur impots.gouv.fr ou avec votre expert-comptable.",
  };
}

/** Période de la prochaine déclaration et date limite indicative. */
export function nextVatDeadline(today = new Date()) {
  const regime = getVatRegime();
  if (regime === "franchise") return null;
  const y = today.getFullYear();
  const m = today.getMonth(); // 0-11
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (regime === "mensuel") {
    const from = new Date(Date.UTC(y, m - 1, 1));
    const to = new Date(Date.UTC(y, m, 0));
    const month = from.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    return {
      label: `TVA ${/^[aeiouyh]/i.test(month) ? "d'" : "de "}${month}`,
      from: iso(from),
      to: iso(to),
      deadline: `entre le 15 et le 24 ${new Date(Date.UTC(y, m, 1)).toLocaleDateString("fr-FR", { month: "long" })} (selon votre SIREN)`,
    };
  }
  const q = Math.floor(m / 3); // trimestre en cours ; on déclare le précédent
  const from = new Date(Date.UTC(y, (q - 1) * 3, 1));
  const to = new Date(Date.UTC(y, q * 3, 0));
  return {
    label: `TVA du ${Math.floor(from.getUTCMonth() / 3) + 1}${from.getUTCMonth() === 0 ? "er" : "e"} trimestre ${from.getUTCFullYear()}`,
    from: iso(from),
    to: iso(to),
    deadline: `entre le 15 et le 24 ${new Date(Date.UTC(y, q * 3, 1)).toLocaleDateString("fr-FR", { month: "long" })} (selon votre SIREN)`,
  };
}

// ---------------------------------------------------------------- Factures

export type InvoiceLine = { label: string; qty: number; unit_price_ht: number; vat_rate: number };

export type Invoice = {
  id: number;
  number: string;
  client: string;
  client_email: string | null;
  client_address: string | null;
  issue_date: string;
  due_date: string;
  lines: string;
  total_ht: number;
  total_vat: number;
  total_ttc: number;
  status: "brouillon" | "envoyée" | "payée" | "annulée";
  paid_date: string | null;
  file: string | null;
};

function nextInvoiceNumber(year: string) {
  const row = db
    .prepare("SELECT number FROM invoices WHERE number LIKE ? ORDER BY id DESC LIMIT 1")
    .get(`FAC-${year}-%`) as { number: string } | undefined;
  const n = row ? Number(row.number.split("-")[2]) + 1 : 1;
  return `FAC-${year}-${String(n).padStart(4, "0")}`;
}

export function createInvoice(input: {
  client: string;
  client_email?: string;
  client_address?: string;
  issue_date?: string;
  due_days?: number;
  lines: InvoiceLine[];
}) {
  if (!input.lines.length) throw new Error("Une facture doit avoir au moins une ligne.");
  const issue = input.issue_date ?? new Date().toISOString().slice(0, 10);
  const due = new Date(issue);
  due.setDate(due.getDate() + (input.due_days ?? 30));
  const dueDate = due.toISOString().slice(0, 10);
  let ht = 0;
  let vat = 0;
  for (const l of input.lines) {
    ht += l.qty * l.unit_price_ht;
    vat += l.qty * l.unit_price_ht * (l.vat_rate / 100);
  }
  const number = nextInvoiceNumber(issue.slice(0, 4));
  const file = `facture-${number}.html`;
  const totals = { ht: round(ht), vat: round(vat), ttc: round(ht + vat) };
  fs.writeFileSync(
    path.join(FILES_DIR, file),
    invoiceHtml({ number, issue, dueDate, ...input, totals }),
    "utf8",
  );
  const r = db
    .prepare(
      `INSERT INTO invoices (number, client, client_email, client_address, issue_date, due_date, lines, total_ht, total_vat, total_ttc, status, file)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'envoyée', ?)`,
    )
    .run(
      number,
      input.client,
      input.client_email ?? null,
      input.client_address ?? null,
      issue,
      dueDate,
      JSON.stringify(input.lines),
      totals.ht,
      totals.vat,
      totals.ttc,
      file,
    );
  return { id: Number(r.lastInsertRowid), number, file, due_date: dueDate, ...totals };
}

function invoiceHtml(d: {
  number: string;
  issue: string;
  dueDate: string;
  client: string;
  client_address?: string;
  client_email?: string;
  lines: InvoiceLine[];
  totals: { ht: number; vat: number; ttc: number };
}) {
  const company = getCompanyProfile();
  const noVat = d.lines.every((l) => l.vat_rate === 0);
  const rows = d.lines
    .map(
      (l) =>
        `<tr><td>${esc(l.label)}</td><td class="r">${l.qty}</td><td class="r">${eur(l.unit_price_ht)}</td><td class="r">${l.vat_rate} %</td><td class="r">${eur(round(l.qty * l.unit_price_ht))}</td></tr>`,
    )
    .join("");
  const fr = (s: string) => new Date(s).toLocaleDateString("fr-FR");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Facture ${d.number}</title>
<style>body{font-family:system-ui,Arial,sans-serif;color:#111;max-width:800px;margin:40px auto;padding:0 24px}
h1{font-size:28px;margin:0}.top{display:flex;justify-content:space-between;gap:24px;margin-bottom:32px}
.box{white-space:pre-line;font-size:14px;line-height:1.5}table{width:100%;border-collapse:collapse;margin-top:24px;font-size:14px}
th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left}.r{text-align:right}tfoot td{font-weight:600}
.legal{margin-top:40px;font-size:11px;color:#555;line-height:1.5}@media print{body{margin:0}}</style></head><body>
<div class="top"><div><h1>Facture</h1><div>N° ${d.number}</div><div>Date : ${fr(d.issue)}</div><div>Échéance : ${fr(d.dueDate)}</div></div>
<div class="box">${esc(company)}</div></div>
<div class="box"><strong>Facturé à :</strong>\n${esc(d.client)}${d.client_address ? "\n" + esc(d.client_address) : ""}${d.client_email ? "\n" + esc(d.client_email) : ""}</div>
<table><thead><tr><th>Désignation</th><th class="r">Qté</th><th class="r">Prix unitaire HT</th><th class="r">TVA</th><th class="r">Total HT</th></tr></thead>
<tbody>${rows}</tbody><tfoot>
<tr><td colspan="4" class="r">Total HT</td><td class="r">${eur(d.totals.ht)}</td></tr>
<tr><td colspan="4" class="r">TVA</td><td class="r">${eur(d.totals.vat)}</td></tr>
<tr><td colspan="4" class="r">Total TTC</td><td class="r">${eur(d.totals.ttc)}</td></tr></tfoot></table>
<div class="legal">${noVat ? "TVA non applicable, art. 293 B du CGI.<br>" : ""}
Paiement à réception, au plus tard le ${fr(d.dueDate)}. Pas d'escompte pour paiement anticipé.<br>
En cas de retard : pénalités au taux de 3 fois le taux d'intérêt légal, et indemnité forfaitaire pour frais de recouvrement de 40 € (art. L441-10 du Code de commerce).</div>
</body></html>`;
}

export function listInvoices(status?: string) {
  const rows = (
    status
      ? db.prepare("SELECT * FROM invoices WHERE status = ? ORDER BY id DESC").all(status)
      : db.prepare("SELECT * FROM invoices ORDER BY id DESC").all()
  ) as Invoice[];
  const today = new Date().toISOString().slice(0, 10);
  return rows.map((i) => ({ ...i, en_retard: i.status === "envoyée" && i.due_date < today }));
}

/** Marque une facture payée et enregistre la recette correspondante dans le journal. */
export function markInvoicePaid(id: number, paidDate?: string) {
  const inv = db.prepare("SELECT * FROM invoices WHERE id = ?").get(id) as Invoice | undefined;
  if (!inv) throw new Error("Facture introuvable.");
  if (inv.status === "payée") return `La facture ${inv.number} est déjà payée.`;
  const date = paidDate ?? new Date().toISOString().slice(0, 10);
  db.prepare("UPDATE invoices SET status = 'payée', paid_date = ? WHERE id = ?").run(date, id);
  // Une écriture par taux de TVA, pour que la déclaration de TVA reste juste.
  const byRate: Record<string, number> = {};
  for (const l of JSON.parse(inv.lines) as InvoiceLine[]) {
    byRate[l.vat_rate] = (byRate[l.vat_rate] ?? 0) + l.qty * l.unit_price_ht * (1 + l.vat_rate / 100);
  }
  const ins = db.prepare("INSERT INTO transactions (date, label, category, amount, vat_rate) VALUES (?, ?, 'Ventes', ?, ?)");
  for (const [rate, ttc] of Object.entries(byRate)) ins.run(date, `Facture ${inv.number} — ${inv.client}`, round(ttc), Number(rate));
  return `Facture ${inv.number} marquée payée le ${date} ; recette de ${eur(inv.total_ttc)} enregistrée.`;
}

// ---------------------------------------------------------------- Planning

export type Employee = { id: number; name: string; role: string | null; email: string | null; weekly_hours: number; notes: string | null; active: number };
export type Shift = { id: number; employee_id: number; date: string; start: string; end: string; label: string | null };
export type Leave = { id: number; employee_id: number; start_date: string; end_date: string; type: string };

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
/** Durée en heures ; un créneau qui finit après minuit (ex. 22:00-02:00) est accepté. */
export const shiftHours = (s: { start: string; end: string }) => {
  let d = toMin(s.end) - toMin(s.start);
  if (d <= 0) d += 24 * 60;
  return d / 60;
};

export function mondayOf(date: string) {
  const d = new Date(date + "T12:00:00Z");
  const day = (d.getUTCDay() + 6) % 7; // 0 = lundi
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

export function addDays(date: string, n: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weekPlanning(anyDate: string) {
  const from = mondayOf(anyDate);
  const to = addDays(from, 6);
  const employees = db.prepare("SELECT * FROM employees WHERE active = 1 ORDER BY name").all() as Employee[];
  const shifts = db
    .prepare("SELECT * FROM shifts WHERE date >= ? AND date <= ? ORDER BY date, start")
    .all(from, to) as Shift[];
  const leaves = db
    .prepare("SELECT * FROM leaves WHERE end_date >= ? AND start_date <= ?")
    .all(from, to) as Leave[];
  const hours = Object.fromEntries(
    employees.map((e) => [e.id, round(shifts.filter((s) => s.employee_id === e.id).reduce((t, s) => t + shiftHours(s), 0))]),
  );
  return { from, to, employees, shifts, leaves, hours, alerts: checkPlanning(from, employees, shifts, leaves) };
}

/**
 * Contrôles de base du Code du travail (cas général, hors accords particuliers) :
 * 10 h max par jour, 48 h max par semaine, 11 h de repos entre deux journées,
 * au moins un jour de repos par semaine, pas de créneau pendant une absence.
 */
export function checkPlanning(from: string, employees: Employee[], shifts: Shift[], leaves: Leave[]) {
  const fr = (d: string) =>
    new Date(d + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  const alerts: { employee: string; level: "erreur" | "info"; message: string }[] = [];
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  for (const e of employees) {
    const mine = shifts.filter((s) => s.employee_id === e.id);
    const perDay = days.map((d) => mine.filter((s) => s.date === d));
    const week = mine.reduce((t, s) => t + shiftHours(s), 0);
    perDay.forEach((list, i) => {
      const h = list.reduce((t, s) => t + shiftHours(s), 0);
      if (h > 10) alerts.push({ employee: e.name, level: "erreur", message: `${round(h)} h le ${fr(days[i])} (max 10 h par jour)` });
    });
    if (week > 48) alerts.push({ employee: e.name, level: "erreur", message: `${round(week)} h sur la semaine (max 48 h)` });
    else if (week > e.weekly_hours)
      alerts.push({ employee: e.name, level: "info", message: `${round(week - e.weekly_hours)} h au-delà du contrat (${e.weekly_hours} h) : heures supplémentaires` });
    if (mine.length && perDay.every((l) => l.length > 0))
      alerts.push({ employee: e.name, level: "erreur", message: "aucun jour de repos dans la semaine" });
    // Repos quotidien : fin du dernier créneau d'un jour → début du premier créneau du lendemain.
    for (let i = 0; i < 6; i++) {
      const today = perDay[i];
      const tomorrow = perDay[i + 1];
      if (!today.length || !tomorrow.length) continue;
      const lastEnd = Math.max(...today.map((s) => toMin(s.start) + shiftHours(s) * 60));
      const firstStart = Math.min(...tomorrow.map((s) => toMin(s.start))) + 24 * 60;
      const rest = (firstStart - lastEnd) / 60;
      if (rest < 11) alerts.push({ employee: e.name, level: "erreur", message: `seulement ${round(rest)} h de repos entre le ${fr(days[i])} et le ${fr(days[i + 1])} (min 11 h)` });
    }
    for (const l of leaves.filter((l) => l.employee_id === e.id)) {
      const clash = mine.filter((s) => s.date >= l.start_date && s.date <= l.end_date);
      if (clash.length) alerts.push({ employee: e.name, level: "erreur", message: `${clash.length} créneau(x) pendant une absence (${l.type})` });
    }
  }
  return alerts;
}

// ---------------------------------------------------------------- Tableau « Aujourd'hui »

export function todayOverview() {
  const today = new Date().toISOString().slice(0, 10);
  const overdue = listInvoices("envoyée").filter((i) => i.en_retard);
  const unpaid = listInvoices("envoyée");
  const drafts = (db.prepare("SELECT COUNT(*) AS n FROM emails WHERE status = 'draft'").get() as { n: number }).n;
  const employees = (db.prepare("SELECT COUNT(*) AS n FROM employees WHERE active = 1").get() as { n: number }).n;
  const nextMonday = addDays(mondayOf(today), 7);
  const nextWeekShifts = (
    db.prepare("SELECT COUNT(*) AS n FROM shifts WHERE date >= ? AND date <= ?").get(nextMonday, addDays(nextMonday, 6)) as { n: number }
  ).n;
  const upcomingLeaves = db
    .prepare(
      `SELECT l.*, e.name FROM leaves l JOIN employees e ON e.id = l.employee_id
       WHERE l.start_date >= ? AND l.start_date <= ? ORDER BY l.start_date`,
    )
    .all(today, addDays(today, 14));
  const thisWeek = weekPlanning(today);
  const month = db
    .prepare(
      `SELECT COALESCE(SUM(CASE WHEN amount > 0 THEN amount END), 0) AS recettes,
              COALESCE(SUM(CASE WHEN amount < 0 THEN -amount END), 0) AS depenses
       FROM transactions WHERE date >= date('now', 'start of month')`,
    )
    .get() as { recettes: number; depenses: number };
  const vat = nextVatDeadline();
  return {
    today,
    vat: vat ? { ...vat, estimate: vatReturn(vat.from, vat.to).a_payer } : null,
    overdue,
    unpaidTotal: round(unpaid.reduce((t, i) => t + i.total_ttc, 0)),
    drafts,
    planning: {
      employees,
      nextWeekMissing: employees > 0 && nextWeekShifts === 0,
      nextMonday,
      alerts: thisWeek.alerts.filter((a) => a.level === "erreur"),
    },
    upcomingLeaves,
    month,
  };
}
