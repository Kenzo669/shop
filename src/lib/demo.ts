// Données d'exemple pour découvrir le logiciel sans rien saisir (entreprise fictive).
// Aucune tâche IA n'est lancée : cela ne consomme aucun token.
import fs from "fs";
import path from "path";
import { db, filesDir, setCompanyProfile } from "./db";
import { addDays, createInvoice, markInvoicePaid, mondayOf } from "./business";
import { getSector, setRateInputs, upsertIngredient, upsertProduct, upsertRecipe } from "./sectors";

export function isEmpty() {
  const count = (t: string) => (db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n;
  return ["transactions", "invoices", "employees", "prospects", "emails", "recipes", "products"].every((t) => count(t) === 0);
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
  loadSectorDemo();
}

/** Données d'exemple propres au métier choisi. */
function loadSectorDemo() {
  const sector = getSector();
  const profiles: Partial<Record<string, string>> = {
    restaurant: "Nom : Le Bistrot des Pentes (exemple)\nActivité : restaurant bistronomique, 45 couverts, midi et soir, vente à emporter\nAdresse : 8 montée de la Grande-Côte, 69001 Lyon\nClients cibles : actifs du quartier le midi, couples et groupes d'amis le soir\nTon de communication : chaleureux et gourmand\nSignature des mails : Camille, Le Bistrot des Pentes",
    ecommerce: "Nom : Maison Lumen (exemple)\nActivité : boutique en ligne de bougies et objets de décoration artisanaux, aussi sur Amazon\nClients cibles : particuliers 25-45 ans, cadeaux\nTon de communication : doux, élégant\nSignature des mails : Camille, Maison Lumen",
    dropshipping: "Nom : Lumen Store (exemple)\nActivité : boutique en dropshipping (maison, bien-être, high-tech), publicités Meta et TikTok\nClients cibles : 18-40 ans, achats d'impulsion\nTon de communication : dynamique, direct\nSignature des mails : Le service client Lumen Store",
    services: "Nom : Camille Martin Conseil (exemple)\nActivité : consultante indépendante en marketing digital pour PME\nClients cibles : PME et commerces de la région lyonnaise\nTon de communication : professionnel et accessible\nSignature des mails : Camille Martin",
  };
  if (profiles[sector]) setCompanyProfile(profiles[sector]!);
  if (sector === "restaurant") {
    const ing: [string, string, number, number, string][] = [
      ["Bœuf haché 15 %", "kg", 13.9, 0, "Boucherie Martin"],
      ["Pain burger brioché", "pièce", 0.42, 0, "Boulangerie Petit"],
      ["Cheddar affiné", "kg", 16.5, 0, "Métro"],
      ["Oignon jaune", "kg", 1.6, 15, "Primeur Halles"],
      ["Pomme de terre", "kg", 1.2, 20, "Primeur Halles"],
      ["Huile de friture", "L", 2.8, 0, "Métro"],
      ["Saumon frais", "kg", 24, 25, "Marée du Port"],
      ["Riz basmati", "kg", 2.9, 0, "Métro"],
      ["Avocat", "pièce", 1.1, 30, "Primeur Halles"],
      ["Chocolat noir 70 %", "kg", 14, 0, "Métro"],
      ["Œuf", "pièce", 0.28, 0, "Ferme Dubois"],
      ["Beurre doux", "kg", 9.8, 0, "Métro"],
      ["Sucre", "kg", 1.3, 0, "Métro"],
      ["Crème liquide 35 %", "L", 4.9, 0, "Métro"],
    ];
    for (const [name, unit, price_ht, waste_pct, supplier] of ing) upsertIngredient({ name, unit, price_ht, waste_pct, supplier });
    upsertRecipe({ name: "Burger maison et frites", category: "Plat", portions: 10, price_ttc: 17.5, items: [
      { ingredient: "Bœuf haché 15 %", quantity: 1.6 }, { ingredient: "Pain burger brioché", quantity: 10 },
      { ingredient: "Cheddar affiné", quantity: 0.3 }, { ingredient: "Oignon jaune", quantity: 0.5 },
      { ingredient: "Pomme de terre", quantity: 2.5 }, { ingredient: "Huile de friture", quantity: 0.8 } ] });
    upsertRecipe({ name: "Poke saumon avocat", category: "Plat", portions: 8, price_ttc: 15.9, items: [
      { ingredient: "Saumon frais", quantity: 1.2 }, { ingredient: "Riz basmati", quantity: 0.8 }, { ingredient: "Avocat", quantity: 6 } ] });
    upsertRecipe({ name: "Fondant au chocolat", category: "Dessert", portions: 12, price_ttc: 8.5, items: [
      { ingredient: "Chocolat noir 70 %", quantity: 0.4 }, { ingredient: "Beurre doux", quantity: 0.3 },
      { ingredient: "Œuf", quantity: 8 }, { ingredient: "Sucre", quantity: 0.25 }, { ingredient: "Crème liquide 35 %", quantity: 0.2 } ] });
    upsertRecipe({ name: "Frites maison", category: "Accompagnement", portions: 10, price_ttc: 4.5, items: [
      { ingredient: "Pomme de terre", quantity: 2.5 }, { ingredient: "Huile de friture", quantity: 0.8 } ] });
  } else if (sector === "ecommerce") {
    upsertProduct({ name: "Bougie parfumée Figue", supplier: "Atelier Cire", cost_ht: 6.5, shipping_cost: 4.9, packaging_cost: 1.2, price_ttc: 29, ad_cost: 3, stock: 42, reorder_level: 20 });
    upsertProduct({ name: "Coffret 3 bougies", supplier: "Atelier Cire", cost_ht: 17, shipping_cost: 5.9, packaging_cost: 2.5, price_ttc: 69, ad_cost: 6, stock: 8, reorder_level: 10 });
    upsertProduct({ name: "Diffuseur rotin", supplier: "Maison Sud", cost_ht: 9, shipping_cost: 4.9, packaging_cost: 1, price_ttc: 24, ad_cost: 7, stock: 65, reorder_level: 15 });
    upsertProduct({ name: "Bougie Amazon (vendue sur la place de marché)", supplier: "Atelier Cire", cost_ht: 6.5, shipping_cost: 5.5, packaging_cost: 1.2, marketplace_pct: 15, price_ttc: 22, ad_cost: 2, stock: 30, reorder_level: 10 });
  } else if (sector === "dropshipping") {
    upsertProduct({ name: "Lampe coucher de soleil", supplier: "Fournisseur EU (5-8 j)", cost_ht: 8.9, shipping_cost: 3.5, price_ttc: 34.9, ad_cost: 11 });
    upsertProduct({ name: "Correcteur de posture", supplier: "Fournisseur EU (6-9 j)", cost_ht: 6.2, shipping_cost: 3.2, price_ttc: 29.9, ad_cost: 16 });
    upsertProduct({ name: "Organiseur de câbles", supplier: "Fournisseur Asie (12-18 j)", cost_ht: 2.1, shipping_cost: 2.4, price_ttc: 19.9, ad_cost: 6.5 });
    upsertProduct({ name: "Mini projecteur", supplier: "Fournisseur EU (4-7 j)", cost_ht: 38, shipping_cost: 6, price_ttc: 89, ad_cost: 22 });
  } else if (sector === "services") {
    setRateInputs({ revenu_net_annuel: 48000, taux_charges_sociales_pct: 25, charges_fixes_annuelles: 4800, jours_travailles_an: 215, taux_facturable_pct: 65 });
  }
}

/** Efface toutes les données (garde les comptes connectés et les réglages IA). */
export function resetData() {
  db.exec(`
    DELETE FROM tasks; DELETE FROM task_logs; DELETE FROM emails; DELETE FROM transactions;
    DELETE FROM prospects; DELETE FROM invoices; DELETE FROM employees; DELETE FROM shifts;
    DELETE FROM leaves; DELETE FROM recurring; DELETE FROM usage;
    DELETE FROM recipe_items; DELETE FROM recipes; DELETE FROM ingredients; DELETE FROM products;
    DELETE FROM settings WHERE key IN ('company');
  `);
  for (const f of fs.readdirSync(filesDir())) fs.rmSync(path.join(filesDir(), f), { force: true });
}
