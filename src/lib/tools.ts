import fs from "fs";
import path from "path";
import { z } from "zod";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { BetaRunnableTool } from "@anthropic-ai/sdk/lib/tools/BetaRunnableTool";
import type Anthropic from "@anthropic-ai/sdk";
import { addLog, db, filesDir } from "./db";
import { AGENTS, type AgentDef } from "./agents";
import { calendarCreate, calendarList, gmailRead, gmailSearch, googleConnected } from "./google";
import { addDays, createInvoice, listInvoices, markInvoicePaid, mondayOf, vatReturn, weekPlanning } from "./business";
import {
  getRateInputs,
  getSector,
  productsOverview,
  rateCalculator,
  restaurantOverview,
  upsertIngredient,
  upsertProduct,
  upsertRecipe,
} from "./sectors";

const ALLOWED_EXT = [".md", ".txt", ".csv", ".html", ".json"];

/** Nettoie un nom de fichier venant du modèle : pas de dossier, pas de "..". */
export function safeFileName(name: string): string | null {
  const base = path.basename(name.trim()).replace(/[^\p{L}\p{N}._ -]/gu, "_");
  if (!base || base.startsWith(".")) return null;
  if (!ALLOWED_EXT.includes(path.extname(base).toLowerCase())) return null;
  return base;
}

type Ctx = {
  agent: AgentDef;
  taskId: number;
  model: string;
  delegate: (agentId: string, instruction: string) => Promise<string>;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTool = BetaRunnableTool<any>;

/** Enveloppe chaque outil pour journaliser son appel et son résultat dans la tâche. */
function logged(ctx: Ctx, tool: AnyTool): AnyTool {
  const run = tool.run;
  return {
    ...tool,
    run: async (input, context) => {
      addLog(ctx.taskId, "tool", `${tool.name} ${JSON.stringify(input).slice(0, 400)}`);
      try {
        const out = await run(input, context);
        return out;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        addLog(ctx.taskId, "error", `${tool.name} : ${msg}`);
        return `Erreur : ${msg}`;
      }
    },
  };
}

function fileTools(): AnyTool[] {
  return [
    betaZodTool({
      name: "create_file",
      description:
        "Crée ou remplace un fichier dans l'espace partagé de l'entreprise. Extensions acceptées : .md, .txt, .csv, .html, .json. Utilise .html pour un document à imprimer (facture, devis), .csv pour un tableau.",
      inputSchema: z.object({
        filename: z.string().describe("Nom du fichier, ex. facture-2026-001.html"),
        content: z.string().describe("Contenu complet du fichier"),
      }),
      run: async ({ filename, content }) => {
        const name = safeFileName(filename);
        if (!name) return `Nom de fichier refusé. Extensions acceptées : ${ALLOWED_EXT.join(", ")}`;
        fs.writeFileSync(path.join(filesDir(), name), content, "utf8");
        return `Fichier enregistré : ${name} (${content.length} caractères)`;
      },
    }),
    betaZodTool({
      name: "list_files",
      description: "Liste les fichiers de l'espace partagé.",
      inputSchema: z.object({}),
      run: async () => {
        const files = fs.readdirSync(filesDir());
        return files.length ? files.join("\n") : "Aucun fichier.";
      },
    }),
    betaZodTool({
      name: "read_file",
      description: "Lit un fichier de l'espace partagé.",
      inputSchema: z.object({ filename: z.string() }),
      run: async ({ filename }) => {
        const name = safeFileName(filename);
        const p = name && path.join(filesDir(), name);
        if (!p || !fs.existsSync(p)) return "Fichier introuvable.";
        return fs.readFileSync(p, "utf8").slice(0, 40_000); // limite la taille relue (coût)
      },
    }),
  ];
}

function mailTools(ctx: Ctx): AnyTool[] {
  return [
    betaZodTool({
      name: "list_emails",
      description: "Liste les mails (reçus, brouillons, envoyés). Filtre optionnel par statut.",
      inputSchema: z.object({
        status: z.enum(["received", "draft", "sent", "failed"]).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      }),
      run: async ({ status, limit }) => {
        const rows = status
          ? db.prepare("SELECT * FROM emails WHERE status = ? ORDER BY id DESC LIMIT ?").all(status, limit ?? 30)
          : db.prepare("SELECT * FROM emails ORDER BY id DESC LIMIT ?").all(limit ?? 30);
        return rows.length ? JSON.stringify(rows, null, 1) : "Aucun mail.";
      },
    }),
    betaZodTool({
      name: "draft_email",
      description:
        "Prépare un mail en brouillon. Il n'est PAS envoyé : un humain le relit et l'envoie depuis l'onglet Mails.",
      inputSchema: z.object({
        to: z.string().describe("Adresse du destinataire (vide si inconnue)"),
        subject: z.string(),
        body: z.string().describe("Corps du mail en texte brut, avec la signature"),
        reply_to_gmail_id: z
          .string()
          .optional()
          .describe("Si c'est une réponse à un mail Gmail : son identifiant (champ id de gmail_search)"),
      }),
      run: async ({ to, subject, body, reply_to_gmail_id }) => {
        const r = db
          .prepare(
            "INSERT INTO emails (direction, status, to_addr, subject, body, agent_id, reply_to_gmail_id) VALUES ('out', 'draft', ?, ?, ?, ?, ?)",
          )
          .run(to, subject, body, ctx.agent.id, reply_to_gmail_id ?? null);
        return `Brouillon n°${r.lastInsertRowid} créé, en attente de validation humaine.`;
      },
    }),
  ];
}

/** Outils de la vraie boîte Gmail du client (seulement si un compte Google est connecté). */
function gmailTools(): AnyTool[] {
  return [
    betaZodTool({
      name: "gmail_search",
      description:
        "Cherche dans la boîte Gmail connectée, avec la syntaxe de recherche Gmail. Exemples : 'is:unread newer_than:3d', 'from:client@exemple.fr', 'subject:facture'. Renvoie expéditeur, objet, date et extrait.",
      inputSchema: z.object({
        query: z.string(),
        max: z.number().int().min(1).max(30).optional(),
      }),
      run: async ({ query, max }) => {
        const rows = await gmailSearch(query, max ?? 15);
        return rows.length ? JSON.stringify(rows, null, 1) : "Aucun mail trouvé.";
      },
    }),
    betaZodTool({
      name: "gmail_read",
      description: "Lit le contenu complet d'un mail Gmail à partir de son id.",
      inputSchema: z.object({ id: z.string() }),
      run: async ({ id }) => JSON.stringify(await gmailRead(id), null, 1),
    }),
  ];
}

function agendaTools(): AnyTool[] {
  return [
    betaZodTool({
      name: "calendar_list",
      description: "Liste les rendez-vous de l'agenda Google connecté entre deux dates (AAAA-MM-JJ ou ISO 8601).",
      inputSchema: z.object({ from: z.string(), to: z.string() }),
      run: async ({ from, to }) => {
        const rows = await calendarList(from, to);
        return rows.length ? JSON.stringify(rows, null, 1) : "Aucun rendez-vous sur cette période.";
      },
    }),
    betaZodTool({
      name: "calendar_create",
      description:
        "Ajoute un rendez-vous dans l'agenda Google connecté. Aucune invitation n'est envoyée aux tiers. Dates au format ISO local, ex. 2026-11-20T14:00:00.",
      inputSchema: z.object({
        summary: z.string(),
        start: z.string(),
        end: z.string(),
        description: z.string().optional(),
        location: z.string().optional(),
      }),
      run: async (ev) => {
        const r = await calendarCreate(ev);
        return `Rendez-vous créé (${r.lien ?? r.id}).`;
      },
    }),
  ];
}

function comptaTools(): AnyTool[] {
  return [
    betaZodTool({
      name: "add_transaction",
      description: "Enregistre une recette (montant positif) ou une dépense (montant négatif), TTC.",
      inputSchema: z.object({
        date: z.string().describe("AAAA-MM-JJ"),
        label: z.string(),
        category: z.string().describe("ex. Ventes, Logiciels, Loyer, Déplacements, Salaires"),
        amount: z.number().describe("TTC ; positif = recette, négatif = dépense"),
        vat_rate: z.number().optional().describe("Taux de TVA en %, 20 par défaut"),
      }),
      run: async ({ date, label, category, amount, vat_rate }) => {
        const r = db
          .prepare("INSERT INTO transactions (date, label, category, amount, vat_rate) VALUES (?, ?, ?, ?, ?)")
          .run(date, label, category, amount, vat_rate ?? 20);
        return `Écriture n°${r.lastInsertRowid} enregistrée.`;
      },
    }),
    betaZodTool({
      name: "list_transactions",
      description: "Liste les écritures, éventuellement sur une période.",
      inputSchema: z.object({
        from: z.string().optional().describe("AAAA-MM-JJ"),
        to: z.string().optional().describe("AAAA-MM-JJ"),
      }),
      run: async ({ from, to }) => {
        const rows = db
          .prepare("SELECT * FROM transactions WHERE date >= ? AND date <= ? ORDER BY date")
          .all(from ?? "0000-00-00", to ?? "9999-12-31");
        return rows.length ? JSON.stringify(rows) : "Aucune écriture.";
      },
    }),
    betaZodTool({
      name: "compta_summary",
      description: "Calcule recettes, dépenses, résultat et TVA (collectée, déductible, à reverser) sur une période.",
      inputSchema: z.object({ from: z.string().optional(), to: z.string().optional() }),
      run: async ({ from, to }) => {
        const rows = db
          .prepare("SELECT amount, vat_rate, category FROM transactions WHERE date >= ? AND date <= ?")
          .all(from ?? "0000-00-00", to ?? "9999-12-31") as { amount: number; vat_rate: number; category: string }[];
        let recettes = 0, depenses = 0, tvaCollectee = 0, tvaDeductible = 0;
        const parCategorie: Record<string, number> = {};
        for (const r of rows) {
          const tva = r.amount - r.amount / (1 + r.vat_rate / 100);
          if (r.amount >= 0) { recettes += r.amount; tvaCollectee += tva; }
          else { depenses += -r.amount; tvaDeductible += -tva; }
          parCategorie[r.category] = (parCategorie[r.category] ?? 0) + r.amount;
        }
        const round = (n: number) => Math.round(n * 100) / 100;
        return JSON.stringify({
          periode: { from: from ?? "début", to: to ?? "aujourd'hui" },
          nb_ecritures: rows.length,
          recettes_ttc: round(recettes),
          depenses_ttc: round(depenses),
          resultat_ttc: round(recettes - depenses),
          tva_collectee: round(tvaCollectee),
          tva_deductible: round(tvaDeductible),
          tva_a_reverser: round(tvaCollectee - tvaDeductible),
          par_categorie: Object.fromEntries(Object.entries(parCategorie).map(([k, v]) => [k, round(v)])),
        });
      },
    }),
  ];
}

function invoiceTools(): AnyTool[] {
  return [
    betaZodTool({
      name: "create_invoice",
      description:
        "Crée une facture numérotée automatiquement (FAC-AAAA-0001…), avec les mentions légales, enregistrée en fichier HTML imprimable. Prix unitaires HT.",
      inputSchema: z.object({
        client: z.string(),
        client_email: z.string().optional(),
        client_address: z.string().optional(),
        issue_date: z.string().optional().describe("AAAA-MM-JJ, aujourd'hui par défaut"),
        due_days: z.number().int().optional().describe("Délai de paiement en jours, 30 par défaut"),
        lines: z
          .array(
            z.object({
              label: z.string(),
              qty: z.number(),
              unit_price_ht: z.number(),
              vat_rate: z.number().describe("20, 10, 5.5, 2.1 ou 0"),
            }),
          )
          .min(1),
      }),
      run: async (input) => JSON.stringify(createInvoice(input)),
    }),
    betaZodTool({
      name: "list_invoices",
      description: "Liste les factures (statut : brouillon, envoyée, payée, annulée) ; le champ en_retard signale les impayés échus.",
      inputSchema: z.object({ status: z.enum(["brouillon", "envoyée", "payée", "annulée"]).optional() }),
      run: async ({ status }) => {
        const rows = listInvoices(status).map(({ lines, ...rest }) => ({ ...rest, nb_lignes: JSON.parse(lines).length }));
        return rows.length ? JSON.stringify(rows) : "Aucune facture.";
      },
    }),
    betaZodTool({
      name: "mark_invoice_paid",
      description: "Marque une facture payée et enregistre automatiquement la recette dans le journal.",
      inputSchema: z.object({ id: z.number().int(), paid_date: z.string().optional() }),
      run: async ({ id, paid_date }) => markInvoicePaid(id, paid_date),
    }),
    betaZodTool({
      name: "vat_return",
      description:
        "Calcule les montants de la déclaration de TVA (formulaire CA3) sur une période, à partir du journal : base HT et TVA par taux, TVA déductible, TVA nette due ou crédit.",
      inputSchema: z.object({ from: z.string().describe("AAAA-MM-JJ"), to: z.string().describe("AAAA-MM-JJ") }),
      run: async ({ from, to }) => JSON.stringify(vatReturn(from, to), null, 1),
    }),
  ];
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function rhTools(): AnyTool[] {
  return [
    betaZodTool({
      name: "add_employee",
      description: "Ajoute un employé (ou met à jour sa fiche s'il existe déjà sous ce nom).",
      inputSchema: z.object({
        name: z.string(),
        role: z.string().optional(),
        email: z.string().optional(),
        weekly_hours: z.number().optional().describe("Heures du contrat par semaine, 35 par défaut"),
        notes: z.string().optional().describe("Disponibilités et contraintes, ex. « pas le mercredi »"),
      }),
      run: async (e) => {
        const existing = db.prepare("SELECT id FROM employees WHERE lower(name) = lower(?) AND active = 1").get(e.name) as
          | { id: number }
          | undefined;
        if (existing) {
          db.prepare(
            "UPDATE employees SET role = COALESCE(?, role), email = COALESCE(?, email), weekly_hours = COALESCE(?, weekly_hours), notes = COALESCE(?, notes) WHERE id = ?",
          ).run(e.role ?? null, e.email ?? null, e.weekly_hours ?? null, e.notes ?? null, existing.id);
          return `Fiche de ${e.name} mise à jour (n°${existing.id}).`;
        }
        const r = db
          .prepare("INSERT INTO employees (name, role, email, weekly_hours, notes) VALUES (?, ?, ?, ?, ?)")
          .run(e.name, e.role ?? null, e.email ?? null, e.weekly_hours ?? 35, e.notes ?? null);
        return `Employé n°${r.lastInsertRowid} ajouté.`;
      },
    }),
    betaZodTool({
      name: "week_planning",
      description:
        "Planning d'une semaine (du lundi au dimanche contenant la date donnée) : employés et contrats, créneaux, absences, heures par employé et alertes du Code du travail.",
      inputSchema: z.object({ date: z.string().describe("Une date de la semaine voulue, AAAA-MM-JJ") }),
      run: async ({ date }) => JSON.stringify(weekPlanning(date)),
    }),
    betaZodTool({
      name: "set_shifts",
      description:
        "Enregistre des créneaux de travail. Avec replace_week, efface d'abord tous les créneaux de cette semaine-là (pour refaire un planning).",
      inputSchema: z.object({
        replace_week: z.string().optional().describe("Une date de la semaine à remplacer, AAAA-MM-JJ"),
        shifts: z.array(
          z.object({
            employee_id: z.number().int(),
            date: z.string().describe("AAAA-MM-JJ"),
            start: z.string().describe("HH:MM"),
            end: z.string().describe("HH:MM"),
            label: z.string().optional().describe("ex. Ouverture, Caisse, Fermeture"),
          }),
        ),
      }),
      run: async ({ replace_week, shifts }) => {
        const bad = shifts.find((s) => !TIME.test(s.start) || !TIME.test(s.end));
        if (bad) return `Heure invalide (${bad.start}-${bad.end}) : format HH:MM attendu.`;
        const tx = db.transaction(() => {
          if (replace_week) {
            const from = mondayOf(replace_week);
            db.prepare("DELETE FROM shifts WHERE date >= ? AND date <= ?").run(from, addDays(from, 6));
          }
          const ins = db.prepare("INSERT INTO shifts (employee_id, date, start, end, label) VALUES (?, ?, ?, ?, ?)");
          for (const s of shifts) ins.run(s.employee_id, s.date, s.start, s.end, s.label ?? null);
        });
        tx();
        const week = weekPlanning(shifts[0]?.date ?? replace_week ?? new Date().toISOString().slice(0, 10));
        return `${shifts.length} créneau(x) enregistré(s). Alertes : ${week.alerts.length ? JSON.stringify(week.alerts) : "aucune"}`;
      },
    }),
    betaZodTool({
      name: "add_leave",
      description: "Enregistre une absence (congés, maladie, formation…).",
      inputSchema: z.object({
        employee_id: z.number().int(),
        start_date: z.string(),
        end_date: z.string(),
        type: z.enum(["congés", "maladie", "formation", "autre"]).optional(),
      }),
      run: async (l) => {
        db.prepare("INSERT INTO leaves (employee_id, start_date, end_date, type) VALUES (?, ?, ?, ?)").run(
          l.employee_id,
          l.start_date,
          l.end_date,
          l.type ?? "congés",
        );
        return "Absence enregistrée.";
      },
    }),
  ];
}

function crmTools(): AnyTool[] {
  return [
    betaZodTool({
      name: "add_prospect",
      description: "Ajoute un prospect au CRM. N'invente aucune coordonnée.",
      inputSchema: z.object({
        company: z.string(),
        contact: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        website: z.string().optional(),
        notes: z.string().optional().describe("Pourquoi c'est un bon prospect, source"),
      }),
      run: async (p) => {
        const exists = db.prepare("SELECT id FROM prospects WHERE lower(company) = lower(?)").get(p.company);
        if (exists) return `${p.company} est déjà dans le CRM.`;
        const r = db
          .prepare("INSERT INTO prospects (company, contact, email, phone, website, notes) VALUES (?, ?, ?, ?, ?, ?)")
          .run(p.company, p.contact ?? null, p.email ?? null, p.phone ?? null, p.website ?? null, p.notes ?? null);
        return `Prospect n°${r.lastInsertRowid} ajouté.`;
      },
    }),
    betaZodTool({
      name: "list_prospects",
      description: "Liste les prospects du CRM, filtre optionnel par statut.",
      inputSchema: z.object({ status: z.string().optional() }),
      run: async ({ status }) => {
        const rows = status
          ? db.prepare("SELECT * FROM prospects WHERE status = ? ORDER BY id DESC").all(status)
          : db.prepare("SELECT * FROM prospects ORDER BY id DESC").all();
        return rows.length ? JSON.stringify(rows) : "CRM vide.";
      },
    }),
    betaZodTool({
      name: "update_prospect_status",
      description: "Change le statut d'un prospect.",
      inputSchema: z.object({
        id: z.number().int(),
        status: z.enum(["nouveau", "contacté", "intéressé", "client", "perdu"]),
      }),
      run: async ({ id, status }) => {
        const r = db.prepare("UPDATE prospects SET status = ? WHERE id = ?").run(status, id);
        return r.changes ? "Statut mis à jour." : "Prospect introuvable.";
      },
    }),
  ];
}

function delegateTools(ctx: Ctx): AnyTool[] {
  const others = AGENTS.filter((a) => a.id !== ctx.agent.id);
  return [
    betaZodTool({
      name: "delegate_task",
      description:
        "Confie une tâche à un collègue et attend son compte rendu. Collègues : " +
        others.map((a) => `${a.id} (${a.name}, ${a.role})`).join(" ; "),
      inputSchema: z.object({
        agent_id: z.enum(others.map((a) => a.id) as [string, ...string[]]),
        instruction: z.string().describe("Consigne complète et autonome pour le collègue"),
      }),
      run: async ({ agent_id, instruction }) => ctx.delegate(agent_id, instruction),
    }),
  ];
}

// Recherche web : version avec filtrage dynamique sur Opus et Sonnet, version de base sur Haiku.
// max_uses limite le nombre de recherches (et donc le coût) par tâche.
function webTools(model: string): Anthropic.Beta.BetaToolUnion[] {
  if (model.startsWith("claude-haiku")) {
    return [
      { type: "web_search_20250305", name: "web_search", max_uses: 6 },
      { type: "web_fetch_20250910", name: "web_fetch", max_uses: 6 },
    ];
  }
  return [
    { type: "web_search_20260209", name: "web_search", max_uses: 6 },
    { type: "web_fetch_20260209", name: "web_fetch", max_uses: 6 },
  ];
}

/** Outils du métier de l'entreprise. canEdit : l'agent peut modifier les fiches (sinon lecture). */
function sectorTools(canEdit: boolean): AnyTool[] {
  const sector = getSector();
  if (sector === "restaurant") {
    const read = betaZodTool({
      name: "restaurant_costing",
      description:
        "Fiches techniques du restaurant avec coût de revient calculé : coût recette, coût portion, prix HT, ratio coût matière, coefficient, prix TTC minimum pour respecter la cible, et liste des ingrédients avec prix et pertes.",
      inputSchema: z.object({}),
      run: async () => JSON.stringify(restaurantOverview()),
    });
    if (!canEdit) return [read];
    return [
      read,
      betaZodTool({
        name: "upsert_ingredient",
        description: "Crée ou met à jour un ingrédient (prix d'achat HT par unité, pourcentage de perte).",
        inputSchema: z.object({
          name: z.string(),
          unit: z.enum(["kg", "L", "pièce"]),
          price_ht: z.number().min(0).describe("Prix d'achat HT pour 1 kg, 1 L ou 1 pièce"),
          waste_pct: z.number().min(0).max(95).optional().describe("Perte à l'épluchage, au parage ou à la cuisson, en %"),
          supplier: z.string().optional(),
        }),
        run: async (i) => `Ingrédient n°${upsertIngredient(i)} enregistré.`,
      }),
      betaZodTool({
        name: "upsert_recipe",
        description:
          "Crée ou remplace une fiche technique. Quantités pour TOUTE la recette, dans l'unité de chaque ingrédient (ex. 0.18 kg). Les ingrédients doivent exister.",
        inputSchema: z.object({
          name: z.string(),
          category: z.string().optional().describe("Entrée, Plat, Dessert, Boisson…"),
          portions: z.number().positive(),
          price_ttc: z.number().min(0).describe("Prix de vente TTC d'une portion"),
          vat_rate: z.number().optional().describe("10 sur place par défaut"),
          items: z.array(z.object({ ingredient: z.string(), quantity: z.number().positive() })).min(1),
        }),
        run: async (r) => {
          const id = upsertRecipe(r);
          const c = restaurantOverview().recipes.find((x) => x.id === id);
          return `Fiche enregistrée : coût portion ${c?.cout_portion} €, ratio coût matière ${c?.ratio_cout_matiere_pct} %.`;
        },
      }),
    ];
  }
  if (sector === "ecommerce" || sector === "dropshipping") {
    const read = betaZodTool({
      name: "products_margins",
      description:
        "Rentabilité de chaque produit : prix HT, frais, coût direct, marge avant pub, marge nette (€ et %), CPA maximal, ROAS de rentabilité, prix TTC minimum pour la marge cible, stock bas.",
      inputSchema: z.object({}),
      run: async () => JSON.stringify(productsOverview()),
    });
    if (!canEdit) return [read];
    return [
      read,
      betaZodTool({
        name: "upsert_product",
        description: "Crée ou met à jour un produit (seuls les champs fournis changent). Montants en euros, frais en %.",
        inputSchema: z.object({
          name: z.string(),
          sku: z.string().optional(),
          supplier: z.string().optional(),
          cost_ht: z.number().min(0).optional().describe("Prix d'achat HT"),
          shipping_cost: z.number().min(0).optional().describe("Livraison payée par vous, par vente"),
          packaging_cost: z.number().min(0).optional(),
          payment_pct: z.number().min(0).optional().describe("Frais de paiement en % du TTC"),
          payment_fixed: z.number().min(0).optional().describe("Frais de paiement fixes par vente"),
          marketplace_pct: z.number().min(0).optional().describe("Commission de la plateforme en % du TTC"),
          ad_cost: z.number().min(0).optional().describe("Coût publicitaire moyen par vente"),
          price_ttc: z.number().min(0).optional(),
          vat_rate: z.number().optional(),
          stock: z.number().int().optional(),
          reorder_level: z.number().int().optional(),
        }),
        run: async (p) => `Produit n°${upsertProduct(p)} enregistré.`,
      }),
    ];
  }
  if (sector === "services") {
    return [
      betaZodTool({
        name: "rate_calculator",
        description:
          "Calcule le chiffre d'affaires nécessaire, les jours facturables, le TJM et le taux horaire minimum. Sans paramètre : utilise les réglages de l'entreprise ; les paramètres fournis les remplacent pour une simulation.",
        inputSchema: z.object({
          revenu_net_annuel: z.number().optional(),
          taux_charges_sociales_pct: z.number().optional(),
          charges_fixes_annuelles: z.number().optional(),
          jours_travailles_an: z.number().optional(),
          taux_facturable_pct: z.number().optional(),
          heures_par_jour: z.number().optional(),
        }),
        run: async (i) =>
          JSON.stringify(rateCalculator({ ...getRateInputs(), ...Object.fromEntries(Object.entries(i).filter(([, v]) => v !== undefined)) })),
      }),
    ];
  }
  return [];
}

export function buildTools(ctx: Ctx): (AnyTool | Anthropic.Beta.BetaToolUnion)[] {
  const tools: (AnyTool | Anthropic.Beta.BetaToolUnion)[] = [];
  // Ordre fixe pour que le cache de prompt reste valide d'une tâche à l'autre.
  const groups = ctx.agent.tools;
  if (groups.includes("delegate")) tools.push(...delegateTools(ctx).map((t) => logged(ctx, t)));
  const google = googleConnected();
  if (groups.includes("mail")) tools.push(...mailTools(ctx).map((t) => logged(ctx, t)));
  if (groups.includes("mail") && google) tools.push(...gmailTools().map((t) => logged(ctx, t)));
  if (groups.includes("agenda") && google) tools.push(...agendaTools().map((t) => logged(ctx, t)));
  if (groups.includes("compta")) tools.push(...comptaTools().map((t) => logged(ctx, t)));
  if (groups.includes("factures")) tools.push(...invoiceTools().map((t) => logged(ctx, t)));
  if (groups.includes("rh")) tools.push(...rhTools().map((t) => logged(ctx, t)));
  if (groups.includes("compta") || groups.includes("delegate"))
    tools.push(...sectorTools(groups.includes("compta")).map((t) => logged(ctx, t)));
  if (groups.includes("crm")) tools.push(...crmTools().map((t) => logged(ctx, t)));
  if (groups.includes("files")) tools.push(...fileTools().map((t) => logged(ctx, t)));
  if (groups.includes("web")) tools.push(...webTools(ctx.model));
  return tools;
}
