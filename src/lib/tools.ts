import fs from "fs";
import path from "path";
import { z } from "zod";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { BetaRunnableTool } from "@anthropic-ai/sdk/lib/tools/BetaRunnableTool";
import type Anthropic from "@anthropic-ai/sdk";
import { addLog, db, FILES_DIR } from "./db";
import { AGENTS, type AgentDef } from "./agents";

const ALLOWED_EXT = [".md", ".txt", ".csv", ".html", ".json"];

/** Nettoie un nom de fichier venant du modèle : pas de dossier, pas de "..". */
export function safeFileName(name: string): string | null {
  const base = path.basename(name.trim()).replace(/[^\p{L}\p{N}._ -]/gu, "_");
  if (!base || base.startsWith(".")) return null;
  if (!ALLOWED_EXT.includes(path.extname(base).toLowerCase())) return null;
  return base;
}

type Ctx = { agent: AgentDef; taskId: number; delegate: (agentId: string, instruction: string) => Promise<string> };
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
        fs.writeFileSync(path.join(FILES_DIR, name), content, "utf8");
        return `Fichier enregistré : ${name} (${content.length} caractères)`;
      },
    }),
    betaZodTool({
      name: "list_files",
      description: "Liste les fichiers de l'espace partagé.",
      inputSchema: z.object({}),
      run: async () => {
        const files = fs.readdirSync(FILES_DIR);
        return files.length ? files.join("\n") : "Aucun fichier.";
      },
    }),
    betaZodTool({
      name: "read_file",
      description: "Lit un fichier de l'espace partagé.",
      inputSchema: z.object({ filename: z.string() }),
      run: async ({ filename }) => {
        const name = safeFileName(filename);
        const p = name && path.join(FILES_DIR, name);
        if (!p || !fs.existsSync(p)) return "Fichier introuvable.";
        return fs.readFileSync(p, "utf8").slice(0, 100_000);
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
      }),
      run: async ({ to, subject, body }) => {
        const r = db
          .prepare(
            "INSERT INTO emails (direction, status, to_addr, subject, body, agent_id) VALUES ('out', 'draft', ?, ?, ?, ?)",
          )
          .run(to, subject, body, ctx.agent.id);
        return `Brouillon n°${r.lastInsertRowid} créé, en attente de validation humaine.`;
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

const WEB_TOOLS: Anthropic.Beta.BetaToolUnion[] = [
  { type: "web_search_20260209", name: "web_search", max_uses: 8 },
  { type: "web_fetch_20260209", name: "web_fetch", max_uses: 8 },
];

export function buildTools(ctx: Ctx): (AnyTool | Anthropic.Beta.BetaToolUnion)[] {
  const tools: (AnyTool | Anthropic.Beta.BetaToolUnion)[] = [];
  // Ordre fixe pour que le cache de prompt reste valide d'une tâche à l'autre.
  const groups = ctx.agent.tools;
  if (groups.includes("delegate")) tools.push(...delegateTools(ctx).map((t) => logged(ctx, t)));
  if (groups.includes("mail")) tools.push(...mailTools(ctx).map((t) => logged(ctx, t)));
  if (groups.includes("compta")) tools.push(...comptaTools().map((t) => logged(ctx, t)));
  if (groups.includes("crm")) tools.push(...crmTools().map((t) => logged(ctx, t)));
  if (groups.includes("files")) tools.push(...fileTools().map((t) => logged(ctx, t)));
  if (groups.includes("web")) tools.push(...WEB_TOOLS);
  return tools;
}
