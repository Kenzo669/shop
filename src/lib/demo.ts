// Données d'exemple pour découvrir le logiciel sans rien saisir (entreprise fictive).
// Aucune tâche IA n'est lancée : cela ne consomme aucun token.
import fs from "fs";
import path from "path";
import { db, FILES_DIR, setCompanyProfile } from "./db";
import { addDays, createInvoice, markInvoicePaid, mondayOf } from "./business";

export function isEmpty() {
  const count = (t: string) => (db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n;
  return ["transactions", "invoices", "employees", "prospects", "emails"].every((t) => count(t) === 0);
}

export function loadDemo() {
  if (!isEmpty()) throw new Error("Des données existent déjà : les exemples ne sont chargés que dans un bureau vide.");
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + "01";
  const lastMonth = addDays(monthStart, -1).slice(0, 8);

  setCompanyProfile(`Nom : Atelier Lumen (exemple)
Activité : agence de design et de sites web pour PME
Adresse : 12 rue de la République, 69002 Lyon
SIRET : 000 000 000 00000 (exemple)
Clients cibles : commerces, artisans et PME locales
Ton de communication : professionnel et chaleureux
Signature des mails : Camille, Atelier Lumen`);

  const tx = db.prepare("INSERT INTO transactions (date, label, category, amount, vat_rate) VALUES (?, ?, ?, ?, ?)");
  const rows: [string, string, string, number, number][] = [
    [lastMonth + "04", "Site vitrine — Boulangerie Petit", "Ventes", 3000, 20],
    [lastMonth + "12", "Maintenance (3 clients)", "Ventes", 900, 20],
    [lastMonth + "20", "Formation WordPress", "Ventes", 1320, 20],
    [lastMonth + "02", "Loyer bureau", "Loyer", -1200, 20],
    [lastMonth + "09", "Ordinateur portable", "Immobilisations", -1800, 20],
    [lastMonth + "15", "Abonnements logiciels", "Logiciels", -233, 20],
    [lastMonth + "22", "Repas client", "Déplacements", -66, 10],
    [monthStart, "Loyer bureau", "Loyer", -1200, 20],
    [addDays(monthStart, 4), "Abonnement Figma", "Logiciels", -89, 20],
  ];
  for (const r of rows) tx.run(...r);

  // Factures : deux payées, deux en retard, une en attente.
  const line = (label: string, price: number) => [{ label, qty: 1, unit_price_ht: price, vat_rate: 20 }];
  const paid1 = createInvoice({ client: "Maison Duval", client_email: "compta@maisonduval.example", issue_date: addDays(today, -45), lines: line("Site e-commerce", 4000) });
  const paid2 = createInvoice({ client: "Garage Lemaire", issue_date: addDays(today, -40), lines: line("Refonte du site", 2200) });
  createInvoice({ client: "Cave des Pentes", client_email: "contact@cavedespentes.example", issue_date: addDays(today, -42), lines: line("Logo et charte graphique", 950) });
  createInvoice({ client: "Studio Yoga Croix-Rousse", issue_date: addDays(today, -35), due_days: 15, lines: line("Page de réservation en ligne", 480) });
  createInvoice({ client: "Fleurs & Sens", client_email: "contact@fleursetsens.example", issue_date: addDays(today, -5), lines: line("Site vitrine en 7 jours", 1490) });
  markInvoicePaid(paid1.id, addDays(today, -10));
  markInvoicePaid(paid2.id, addDays(today, -6));

  const p = db.prepare("INSERT INTO prospects (company, contact, email, phone, website, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?)");
  p.run("Boulangerie Saint-Jean", "Mme Moreau", null, null, null, "Pas de site, très bien notée sur Google", "nouveau");
  p.run("Fleurs & Sens", null, "contact@fleursetsens.example", null, null, "Site ancien, non adapté au mobile", "client");
  p.run("Cave des Pentes", null, null, null, null, "Aucune vente en ligne", "contacté");
  p.run("Studio Yoga Croix-Rousse", "Léa B.", null, null, null, "Réservations par téléphone uniquement", "intéressé");

  const e = db.prepare("INSERT INTO emails (direction, status, from_addr, to_addr, subject, body, agent_id) VALUES (?, ?, ?, ?, ?, ?, ?)");
  e.run("in", "received", "julie.martin@maisonduval.example", null, "Question sur la maintenance du site",
    "Bonjour,\nEst-ce que la maintenance mensuelle comprend les mises à jour de sécurité ?\nMerci,\nJulie", null);
  e.run("out", "draft", null, "julie.martin@maisonduval.example", "Re: Question sur la maintenance du site",
    "Bonjour Julie,\n\nOui, la maintenance mensuelle comprend toutes les mises à jour de sécurité, une sauvegarde complète chaque semaine et une vérification du bon fonctionnement de votre boutique.\n\nBelle journée,\nCamille, Atelier Lumen", "mail");

  const emp = db.prepare("INSERT INTO employees (name, role, email, weekly_hours, notes) VALUES (?, ?, ?, ?, ?)");
  const camille = Number(emp.run("Camille Martin", "Cheffe de projet", "camille@lumen.example", 35, null).lastInsertRowid);
  const hugo = Number(emp.run("Hugo Bernard", "Développeur", "hugo@lumen.example", 35, "Télétravail le vendredi").lastInsertRowid);
  const sarah = Number(emp.run("Sarah Lefèvre", "Graphiste", "sarah@lumen.example", 28, "Pas disponible le mercredi").lastInsertRowid);
  const lucas = Number(emp.run("Lucas Petit", "Alternant", null, 24, "École le lundi et le mardi").lastInsertRowid);

  const mon = mondayOf(today);
  const s = db.prepare("INSERT INTO shifts (employee_id, date, start, end, label) VALUES (?, ?, ?, ?, ?)");
  for (let i = 0; i < 5; i++) {
    s.run(camille, addDays(mon, i), "09:00", "12:30", null);
    s.run(camille, addDays(mon, i), "13:30", "17:00", null);
    s.run(hugo, addDays(mon, i), "09:30", "17:30", i === 4 ? "Télétravail" : null);
  }
  s.run(hugo, addDays(mon, 2), "18:00", "21:00", "Mise en ligne"); // volontairement trop long : déclenche une alerte
  for (const i of [0, 1, 3, 4]) s.run(sarah, addDays(mon, i), "09:00", "16:00", null);
  for (const i of [2, 3, 4]) s.run(lucas, addDays(mon, i), "09:00", "17:00", null);
  db.prepare("INSERT INTO leaves (employee_id, start_date, end_date, type) VALUES (?, ?, ?, 'congés')").run(
    sarah,
    addDays(today, 9),
    addDays(today, 13),
  );
}

/** Efface toutes les données (garde les comptes connectés et les réglages IA). */
export function resetData() {
  db.exec(`
    DELETE FROM tasks; DELETE FROM task_logs; DELETE FROM emails; DELETE FROM transactions;
    DELETE FROM prospects; DELETE FROM invoices; DELETE FROM employees; DELETE FROM shifts;
    DELETE FROM leaves; DELETE FROM recurring; DELETE FROM usage;
    DELETE FROM settings WHERE key IN ('company');
  `);
  for (const f of fs.readdirSync(FILES_DIR)) fs.rmSync(path.join(FILES_DIR, f), { force: true });
}
