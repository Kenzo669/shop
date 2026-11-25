// Assistant conseil (chat) : réfléchit avec l'entrepreneur, chiffres réels à l'appui,
// et n'agit (enregistrer, confier une tâche) qu'après son accord explicite.
import Anthropic from "@anthropic-ai/sdk";
import crypto from "crypto";
import { z } from "zod";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { db, getCompanyProfile, registerSchema } from "./db";
import { AGENTS, AGENT_BY_ID } from "./agents";
import { SECTOR_BY_ID } from "./sector-info";
import {
  getSector,
  getTargets,
  productEconomics,
  recipeCosting,
  usableUnitCost,
  type Ingredient,
  type Product,
} from "./sectors";
import { sectorAlerts } from "./sectors";
import { todayOverview, vatReturn } from "./business";
import { sectorTools, type AnyTool } from "./tools";
import { budgetBlockReason, getAssistantSettings, monthSpend, recordUsage } from "./billing";
import { createTask, startTask } from "./runner";

registerSchema(`
  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL,          -- user | assistant
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS chat_conv ON chat_messages (user_id, conversation_id, id);
`);

export type ChatMessage = { id: number; role: "user" | "assistant"; content: string; created_at: string };

export function latestConversation(userId: number) {
  const row = db.prepare("SELECT conversation_id FROM chat_messages WHERE user_id = ? ORDER BY id DESC LIMIT 1").get(userId) as
    | { conversation_id: string }
    | undefined;
  return row?.conversation_id ?? null;
}

export function history(userId: number, conversationId: string) {
  return db
    .prepare("SELECT id, role, content, created_at FROM chat_messages WHERE user_id = ? AND conversation_id = ? ORDER BY id")
    .all(userId, conversationId) as ChatMessage[];
}

function save(userId: number, conversationId: string, role: "user" | "assistant", content: string) {
  db.prepare("INSERT INTO chat_messages (user_id, conversation_id, role, content) VALUES (?, ?, ?, ?)").run(userId, conversationId, role, content);
}

let client: Anthropic | null = null;

// ------------------------------------------------------------------ Outils de l'assistant

const ingredientInput = z.object({
  name: z.string(),
  quantity: z.number().positive().describe("Quantité pour toute la recette, dans l'unité de l'ingrédient"),
  unit: z.enum(["kg", "L", "pièce"]).optional(),
  price_ht: z.number().min(0).optional().describe("Prix d'achat HT par unité : seulement si l'ingrédient n'existe pas encore (estimation)"),
  waste_pct: z.number().min(0).max(95).optional(),
});

function assistantTools(userId: number): (AnyTool | Anthropic.Beta.BetaToolUnion)[] {
  const sector = getSector();
  const tools: (AnyTool | Anthropic.Beta.BetaToolUnion)[] = [
    betaZodTool({
      name: "business_snapshot",
      description:
        "Vue d'ensemble de l'entreprise aujourd'hui : recettes et dépenses du mois, factures impayées et en retard, TVA à venir, planning, alertes métier.",
      inputSchema: z.object({}),
      eager_input_streaming: true,
      run: async () => JSON.stringify({ ...todayOverview(), alertes_metier: sectorAlerts() }),
    }),
    betaZodTool({
      name: "vat_return",
      description: "Montants de TVA (formulaire CA3) sur une période, à partir du journal.",
      inputSchema: z.object({ from: z.string(), to: z.string() }),
      eager_input_streaming: true,
      run: async ({ from, to }) => JSON.stringify(vatReturn(from, to)),
    }),
    betaZodTool({
      name: "delegate_to_agent",
      description:
        "Confie une tâche à un agent du bureau, qui la réalise en arrière-plan. À utiliser SEULEMENT après l'accord explicite de l'utilisateur dans la conversation. Agents : " +
        AGENTS.map((a) => `${a.id} (${a.name}, ${a.role})`).join(" ; "),
      inputSchema: z.object({
        agent_id: z.enum(AGENTS.map((a) => a.id) as [string, ...string[]]),
        instruction: z.string().describe("Consigne complète et autonome"),
      }),
      eager_input_streaming: true,
      run: async ({ agent_id, instruction }) => {
        const id = createTask(agent_id, instruction);
        void startTask(id);
        return `Tâche n°${id} confiée à ${AGENT_BY_ID[agent_id].name}. L'utilisateur peut la suivre dans le bureau.`;
      },
    }),
  ];

  if (sector === "restaurant") {
    tools.push(
      betaZodTool({
        name: "simulate_recipe",
        description:
          "Calcule le coût de revient d'un plat SANS l'enregistrer : utilise les prix des ingrédients déjà enregistrés, ou les estimations fournies pour les nouveaux. Renvoie coût portion, ratio coût matière, coefficient, marge et prix minimum pour la cible.",
        inputSchema: z.object({
          name: z.string(),
          portions: z.number().positive(),
          price_ttc: z.number().min(0).describe("Prix de vente TTC envisagé pour une portion"),
          vat_rate: z.number().optional(),
          items: z.array(ingredientInput).min(1),
        }),
        eager_input_streaming: true,
        run: async (r) => {
          const known = new Map(
            (db.prepare("SELECT * FROM ingredients").all() as Ingredient[]).map((i) => [i.name.toLowerCase(), i]),
          );
          const estimated: string[] = [];
          const missing: string[] = [];
          const items = r.items.flatMap((it) => {
            const k = known.get(it.name.toLowerCase());
            if (k) return [{ quantity: it.quantity, ingredient: k }];
            if (it.price_ht === undefined) {
              missing.push(it.name);
              return [];
            }
            estimated.push(it.name);
            return [{ quantity: it.quantity, ingredient: { id: 0, name: it.name, unit: it.unit ?? "kg", price_ht: it.price_ht, waste_pct: it.waste_pct ?? 0, supplier: null } }];
          });
          if (missing.length) return `Prix inconnus pour : ${missing.join(", ")}. Donne une estimation (price_ht) ou demande le prix à l'utilisateur.`;
          const c = recipeCosting({ id: 0, name: r.name, category: "Simulation", portions: r.portions, price_ttc: r.price_ttc, vat_rate: r.vat_rate ?? 10 }, items, getTargets().foodCostPct);
          return JSON.stringify({ ...c, cible_cout_matiere_pct: getTargets().foodCostPct, prix_estimes: estimated, cout_utile_par_unite: items.map((i) => ({ ingredient: i.ingredient.name, cout: Math.round(usableUnitCost(i.ingredient) * 100) / 100 })) });
        },
      }),
    );
  }
  if (sector === "ecommerce" || sector === "dropshipping") {
    tools.push(
      betaZodTool({
        name: "simulate_product",
        description:
          "Calcule la rentabilité d'un produit SANS l'enregistrer : marge nette par vente, CPA maximal, ROAS minimal, prix minimum pour la marge cible. Idéal pour valider un produit avant de le lancer.",
        inputSchema: z.object({
          name: z.string(),
          cost_ht: z.number().min(0),
          shipping_cost: z.number().min(0).optional(),
          packaging_cost: z.number().min(0).optional(),
          price_ttc: z.number().min(0),
          ad_cost: z.number().min(0).optional().describe("Coût publicitaire estimé par vente"),
          payment_pct: z.number().min(0).optional(),
          payment_fixed: z.number().min(0).optional(),
          marketplace_pct: z.number().min(0).optional(),
          vat_rate: z.number().optional(),
        }),
        eager_input_streaming: true,
        run: async (p) => {
          const product: Product = {
            id: 0, sku: null, supplier: null, stock: null, reorder_level: null,
            shipping_cost: 0, packaging_cost: 0, payment_pct: 1.5, payment_fixed: 0.25, marketplace_pct: 0, ad_cost: 0, vat_rate: 20,
            ...Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)),
          } as Product;
          return JSON.stringify({ ...productEconomics(product, getTargets().netMarginPct), marge_cible_pct: getTargets().netMarginPct });
        },
      }),
    );
  }
  // Outils du métier : lecture des données réelles, et enregistrement (après accord).
  tools.push(...sectorTools(true));
  if (sector !== "general") {
    tools.push({ type: "web_search_20260209", name: "web_search", max_uses: 5 }, { type: "web_fetch_20260209", name: "web_fetch", max_uses: 4 });
  } else {
    tools.push({ type: "web_search_20260209", name: "web_search", max_uses: 3 });
  }
  void userId;
  return tools;
}

function systemPrompt() {
  const info = SECTOR_BY_ID[getSector()];
  const guidance = info.guidance["*"] ? `\n${info.guidance["*"]}\n` : "";
  return `Tu es l'assistant conseil intégré à Bureau IA : ${info.assistant.title.toLowerCase()}. Tu aides l'entrepreneur à réfléchir et à décider, comme un associé expérimenté de son métier.
${guidance}
Profil de l'entreprise :
${getCompanyProfile()}

Façon de travailler :
- Appuie-toi sur ses vrais chiffres (business_snapshot et les outils du métier) avant de conseiller. Ne calcule jamais de tête : utilise les outils de calcul et de simulation.
- Pour une recherche (produit gagnant, tendances, fournisseurs, prix du marché, idées de plats), cherche sur le web et cite tes sources ; distingue clairement faits vérifiés et estimations.
- Sois concret et actionnable : chiffres, options comparées, recommandation claire, prochaine étape.
- Pose une question à la fois quand une information indispensable manque.
- Avant toute action qui modifie des données (enregistrer un plat, un produit, un ingrédient) ou qui confie une tâche à un agent : résume ce que tu vas faire et attends un « oui » explicite de l'utilisateur.
- Réponds en français, de façon conversationnelle et compacte : paragraphes courts, listes à puces quand c'est utile, **gras** pour les chiffres clés. Pas de tableaux larges.`;
}

// ------------------------------------------------------------------ Conversation (réponse en flux)

export type ChatEvent =
  | { type: "text"; delta: string }
  | { type: "tool"; label: string }
  | { type: "done"; conversationId: string; cost: number; monthSpend: number }
  | { type: "error"; message: string };

const TOOL_LABELS: Record<string, string> = {
  business_snapshot: "📊 Lecture de vos chiffres",
  vat_return: "🧾 Calcul de la TVA",
  delegate_to_agent: "👥 Transmission à un agent",
  simulate_recipe: "🧮 Calcul du coût de revient",
  simulate_product: "🧮 Calcul de la rentabilité",
  restaurant_costing: "🍽️ Lecture de la carte",
  products_margins: "📦 Lecture des marges",
  rate_calculator: "💼 Calcul du TJM",
  upsert_ingredient: "💾 Enregistrement d'un ingrédient",
  upsert_recipe: "💾 Enregistrement du plat",
  upsert_product: "💾 Enregistrement du produit",
  web_search: "🔎 Recherche sur le web",
  web_fetch: "🌐 Lecture d'une page",
};

export async function chat(userId: number, conversationId: string | null, message: string, emit: (e: ChatEvent) => void) {
  const blocked = budgetBlockReason();
  if (blocked) return emit({ type: "error", message: blocked });
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return emit({ type: "error", message: "Clé API Claude absente : ajoutez ANTHROPIC_API_KEY dans .env.local puis relancez." });
  }
  const conv = conversationId ?? crypto.randomBytes(8).toString("hex");
  // Historique en texte simple (les étapes d'outils ne sont pas rejouées : moins de tokens).
  const past = history(userId, conv).slice(-20);
  save(userId, conv, "user", message);
  const { model, effort } = getAssistantSettings();
  const haiku = model.startsWith("claude-haiku");
  client ??= new Anthropic();

  const runner = client.beta.messages.toolRunner({
    model,
    max_tokens: 16000,
    max_iterations: 12,
    stream: true,
    ...(haiku ? {} : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }),
    output_config: { effort },
    cache_control: { type: "ephemeral" },
    system: systemPrompt(),
    tools: haiku
      ? assistantTools(userId).map((t) =>
          "type" in t && t.type === "web_search_20260209"
            ? { type: "web_search_20250305" as const, name: "web_search" as const, max_uses: 5 }
            : "type" in t && t.type === "web_fetch_20260209"
              ? { type: "web_fetch_20250910" as const, name: "web_fetch" as const, max_uses: 4 }
              : t,
        )
      : assistantTools(userId),
    messages: [
      ...past.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: `${message}\n\n(Date du jour : ${new Date().toISOString().slice(0, 10)})` },
    ],
  });

  let answer = "";
  let cost = 0;
  try {
    for await (const stream of runner) {
      stream.on("text", (delta) => {
        answer += delta;
        emit({ type: "text", delta });
      });
      stream.on("streamEvent", (ev) => {
        if (ev.type === "content_block_start") {
          const b = ev.content_block as { type: string; name?: string };
          if ((b.type === "tool_use" || b.type === "server_tool_use") && b.name) {
            emit({ type: "tool", label: TOOL_LABELS[b.name] ?? "⚙️ Analyse" });
            if (answer && !answer.endsWith("\n\n")) {
              answer += "\n\n";
              emit({ type: "text", delta: "\n\n" });
            }
          }
        }
      });
      const msg = await stream.finalMessage();
      cost += recordUsage(0, "assistant", msg.model, msg.usage);
      if (msg.stop_reason === "refusal") {
        emit({ type: "text", delta: "\n\nJe ne peux pas répondre à cette demande." });
        answer += "\n\nJe ne peux pas répondre à cette demande.";
      }
    }
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    emit({ type: "error", message: `Erreur de l'IA : ${m}` });
    if (!answer) return;
  }
  save(userId, conv, "assistant", answer.trim() || "(pas de réponse)");
  emit({ type: "done", conversationId: conv, cost, monthSpend: monthSpend() });
}
