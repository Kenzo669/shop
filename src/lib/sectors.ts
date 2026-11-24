// Modules par métier : calculs exacts (sans IA) et données propres à chaque secteur.
import { db, getSetting, registerSchema, setSetting } from "./db";
import { SECTOR_BY_ID, type SectorId } from "./sector-info";

registerSchema(`
  CREATE TABLE IF NOT EXISTS ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    unit TEXT NOT NULL DEFAULT 'kg',      -- kg | L | pièce
    price_ht REAL NOT NULL,               -- prix d'achat HT par unité
    waste_pct REAL NOT NULL DEFAULT 0,    -- perte (épluchage, parage, cuisson) en %
    supplier TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    category TEXT NOT NULL DEFAULT 'Plat',
    portions REAL NOT NULL DEFAULT 1,
    price_ttc REAL NOT NULL DEFAULT 0,    -- prix de vente à la carte
    vat_rate REAL NOT NULL DEFAULT 10
  );
  CREATE TABLE IF NOT EXISTS recipe_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    ingredient_id INTEGER NOT NULL,
    quantity REAL NOT NULL                -- dans l'unité de l'ingrédient, pour toute la recette
  );
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    sku TEXT,
    supplier TEXT,
    cost_ht REAL NOT NULL DEFAULT 0,        -- prix d'achat HT (fournisseur)
    shipping_cost REAL NOT NULL DEFAULT 0,  -- livraison payée par vous, par vente
    packaging_cost REAL NOT NULL DEFAULT 0,
    payment_pct REAL NOT NULL DEFAULT 1.5,  -- frais de paiement (% du TTC)
    payment_fixed REAL NOT NULL DEFAULT 0.25,
    marketplace_pct REAL NOT NULL DEFAULT 0, -- commission plateforme (% du TTC)
    ad_cost REAL NOT NULL DEFAULT 0,        -- coût publicitaire moyen par vente
    price_ttc REAL NOT NULL DEFAULT 0,
    vat_rate REAL NOT NULL DEFAULT 20,
    stock INTEGER,                          -- NULL = pas de stock (dropshipping)
    reorder_level INTEGER
  );
`);

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

export function getSector(): SectorId {
  const s = getSetting<SectorId>("sector", "general");
  return SECTOR_BY_ID[s] ? s : "general";
}

export function setSector(s: SectorId) {
  if (!SECTOR_BY_ID[s]) throw new Error("Métier inconnu.");
  setSetting("sector", s);
}

export type Targets = { foodCostPct: number; netMarginPct: number };
export const getTargets = (): Targets => ({ foodCostPct: 30, netMarginPct: 20, ...getSetting<Partial<Targets>>("targets", {}) });
export const setTargets = (t: Partial<Targets>) => setSetting("targets", { ...getTargets(), ...t });

// ------------------------------------------------------------------ Restaurant

export type Ingredient = { id: number; name: string; unit: string; price_ht: number; waste_pct: number; supplier: string | null };
type Recipe = { id: number; name: string; category: string; portions: number; price_ttc: number; vat_rate: number };

/** Coût réel d'une unité utilisable : 1 kg de carottes à 20 % de perte coûte 1/0,8 kg acheté. */
export const usableUnitCost = (i: Pick<Ingredient, "price_ht" | "waste_pct">) =>
  i.price_ht / (1 - Math.min(Math.max(i.waste_pct, 0), 95) / 100);

export function recipeCosting(r: Recipe, items: { quantity: number; ingredient: Ingredient }[], targetPct: number) {
  const lines = items.map((it) => ({
    ingredient: it.ingredient.name,
    quantity: it.quantity,
    unit: it.ingredient.unit,
    cost: round(it.quantity * usableUnitCost(it.ingredient), 3),
  }));
  const total = lines.reduce((t, l) => t + l.cost, 0);
  const portion = r.portions > 0 ? total / r.portions : total;
  const priceHt = r.price_ttc / (1 + r.vat_rate / 100);
  const foodCost = priceHt > 0 ? (portion / priceHt) * 100 : null;
  return {
    ...r,
    lines,
    cout_recette: round(total),
    cout_portion: round(portion),
    prix_ht: round(priceHt),
    marge_brute_portion: round(priceHt - portion),
    ratio_cout_matiere_pct: foodCost === null ? null : round(foodCost, 1),
    coefficient: portion > 0 ? round(priceHt / portion) : null,
    prix_minimum_ttc: round((portion / (targetPct / 100)) * (1 + r.vat_rate / 100)),
    au_dessus_cible: foodCost !== null && foodCost > targetPct,
  };
}

export function restaurantOverview() {
  const target = getTargets().foodCostPct;
  const ingredients = db.prepare("SELECT * FROM ingredients ORDER BY name").all() as Ingredient[];
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  const recipes = (db.prepare("SELECT * FROM recipes ORDER BY category, name").all() as Recipe[]).map((r) => {
    const items = (db.prepare("SELECT ingredient_id, quantity FROM recipe_items WHERE recipe_id = ?").all(r.id) as {
      ingredient_id: number;
      quantity: number;
    }[])
      .filter((it) => byId.has(it.ingredient_id))
      .map((it) => ({ quantity: it.quantity, ingredient: byId.get(it.ingredient_id)! }));
    return recipeCosting(r, items, target);
  });
  const priced = recipes.filter((r) => r.ratio_cout_matiere_pct !== null);
  const avg = priced.length ? round(priced.reduce((t, r) => t + r.ratio_cout_matiere_pct!, 0) / priced.length, 1) : null;
  return { target, ingredients, recipes, moyenne_cout_matiere_pct: avg, alertes: recipes.filter((r) => r.au_dessus_cible).map((r) => r.name) };
}

export function upsertIngredient(i: { name: string; unit?: string; price_ht: number; waste_pct?: number; supplier?: string }) {
  db.prepare(
    `INSERT INTO ingredients (name, unit, price_ht, waste_pct, supplier) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET unit = excluded.unit, price_ht = excluded.price_ht, waste_pct = excluded.waste_pct,
       supplier = COALESCE(excluded.supplier, ingredients.supplier), updated_at = datetime('now')`,
  ).run(i.name.trim(), i.unit ?? "kg", i.price_ht, i.waste_pct ?? 0, i.supplier ?? null);
  return (db.prepare("SELECT id FROM ingredients WHERE name = ?").get(i.name.trim()) as { id: number }).id;
}

/** Crée ou remplace une fiche technique ; les ingrédients inconnus sont refusés (à créer d'abord avec leur prix). */
export function upsertRecipe(r: {
  name: string;
  category?: string;
  portions: number;
  price_ttc: number;
  vat_rate?: number;
  items: { ingredient: string; quantity: number }[];
}) {
  const missing = r.items.filter((it) => !db.prepare("SELECT 1 FROM ingredients WHERE name = ?").get(it.ingredient.trim()));
  if (missing.length) throw new Error(`Ingrédients inconnus (à ajouter avec leur prix) : ${missing.map((m) => m.ingredient).join(", ")}`);
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO recipes (name, category, portions, price_ttc, vat_rate) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(name) DO UPDATE SET category = excluded.category, portions = excluded.portions,
         price_ttc = excluded.price_ttc, vat_rate = excluded.vat_rate`,
    ).run(r.name.trim(), r.category ?? "Plat", r.portions, r.price_ttc, r.vat_rate ?? 10);
    const id = (db.prepare("SELECT id FROM recipes WHERE name = ?").get(r.name.trim()) as { id: number }).id;
    db.prepare("DELETE FROM recipe_items WHERE recipe_id = ?").run(id);
    const ins = db.prepare("INSERT INTO recipe_items (recipe_id, ingredient_id, quantity) VALUES (?, ?, ?)");
    for (const it of r.items) {
      const ing = db.prepare("SELECT id FROM ingredients WHERE name = ?").get(it.ingredient.trim()) as { id: number };
      ins.run(id, ing.id, it.quantity);
    }
    return id;
  });
  return tx();
}

export function deleteRecipe(id: number) {
  db.prepare("DELETE FROM recipe_items WHERE recipe_id = ?").run(id);
  db.prepare("DELETE FROM recipes WHERE id = ?").run(id);
}

export function deleteIngredient(id: number) {
  const used = db.prepare("SELECT COUNT(*) AS n FROM recipe_items WHERE ingredient_id = ?").get(id) as { n: number };
  if (used.n) throw new Error("Ingrédient utilisé dans une recette : retirez-le d'abord de la recette.");
  db.prepare("DELETE FROM ingredients WHERE id = ?").run(id);
}

// ------------------------------------------------------------------ E-commerce et dropshipping

export type Product = {
  id: number;
  name: string;
  sku: string | null;
  supplier: string | null;
  cost_ht: number;
  shipping_cost: number;
  packaging_cost: number;
  payment_pct: number;
  payment_fixed: number;
  marketplace_pct: number;
  ad_cost: number;
  price_ttc: number;
  vat_rate: number;
  stock: number | null;
  reorder_level: number | null;
};

/** Rentabilité d'une vente. Les frais de paiement et commissions s'appliquent au prix TTC encaissé. */
export function productEconomics(p: Product, targetNetPct: number) {
  const priceHt = p.price_ttc / (1 + p.vat_rate / 100);
  const pctFees = (p.payment_pct + p.marketplace_pct) / 100;
  const fees = pctFees * p.price_ttc + p.payment_fixed;
  const direct = p.cost_ht + p.shipping_cost + p.packaging_cost;
  const beforeAds = priceHt - direct - fees;
  const net = beforeAds - p.ad_cost;
  // Prix HT donnant la marge nette cible : P - direct - pctFees·(1+TVA)·P - fixe - pub = cible·P
  const denom = 1 - targetNetPct / 100 - pctFees * (1 + p.vat_rate / 100);
  const suggestedHt = denom > 0 ? (direct + p.payment_fixed + p.ad_cost) / denom : null;
  return {
    ...p,
    prix_ht: round(priceHt),
    frais_paiement_commission: round(fees),
    cout_direct: round(direct),
    marge_avant_pub: round(beforeAds),
    marge_nette: round(net),
    marge_nette_pct: priceHt > 0 ? round((net / priceHt) * 100, 1) : null,
    cpa_max: round(Math.max(beforeAds, 0)), // coût d'acquisition maximal avant de perdre de l'argent
    roas_rentabilite: beforeAds > 0 ? round(p.price_ttc / beforeAds) : null, // CA TTC / dépense pub
    prix_minimum_ttc: suggestedHt === null ? null : round(suggestedHt * (1 + p.vat_rate / 100)),
    a_perte: net < 0,
    stock_bas: p.stock !== null && p.reorder_level !== null && p.stock <= p.reorder_level,
  };
}

export function productsOverview() {
  const target = getTargets().netMarginPct;
  const products = (db.prepare("SELECT * FROM products ORDER BY name").all() as Product[]).map((p) => productEconomics(p, target));
  return {
    target,
    products,
    a_perte: products.filter((p) => p.a_perte).map((p) => p.name),
    sous_cible: products.filter((p) => !p.a_perte && p.marge_nette_pct !== null && p.marge_nette_pct < target).map((p) => p.name),
    stock_bas: products.filter((p) => p.stock_bas).map((p) => ({ name: p.name, stock: p.stock })),
  };
}

const PRODUCT_FIELDS = [
  "sku", "supplier", "cost_ht", "shipping_cost", "packaging_cost", "payment_pct", "payment_fixed",
  "marketplace_pct", "ad_cost", "price_ttc", "vat_rate", "stock", "reorder_level",
] as const;

export function upsertProduct(p: Partial<Omit<Product, "id">> & { name: string }) {
  const existing = db.prepare("SELECT * FROM products WHERE name = ?").get(p.name.trim()) as Product | undefined;
  const defaults = getSetting<Partial<Product>>("product_defaults", {});
  const merged = { ...defaults, ...(existing ?? {}), ...Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)) } as Product;
  if (existing) {
    db.prepare(`UPDATE products SET ${PRODUCT_FIELDS.map((f) => `${f} = ?`).join(", ")} WHERE id = ?`).run(
      ...PRODUCT_FIELDS.map((f) => merged[f] ?? null),
      existing.id,
    );
    return existing.id;
  }
  const cols = ["name", ...PRODUCT_FIELDS.filter((f) => merged[f] !== undefined && merged[f] !== null)];
  const r = db
    .prepare(`INSERT INTO products (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`)
    .run(...cols.map((c) => (c === "name" ? p.name.trim() : merged[c as keyof Product])));
  return Number(r.lastInsertRowid);
}

export function deleteProduct(id: number) {
  db.prepare("DELETE FROM products WHERE id = ?").run(id);
}

// ------------------------------------------------------------------ Services / freelance

export type RateInputs = {
  revenu_net_annuel: number; // ce que vous voulez gagner, net
  taux_charges_sociales_pct: number; // part du chiffre d'affaires partant en cotisations et impôts
  charges_fixes_annuelles: number; // logiciels, local, assurance, comptable…
  jours_travailles_an: number;
  taux_facturable_pct: number; // part des jours réellement facturés (le reste : prospection, admin)
  heures_par_jour: number;
};

export const DEFAULT_RATE_INPUTS: RateInputs = {
  revenu_net_annuel: 40000,
  taux_charges_sociales_pct: 45,
  charges_fixes_annuelles: 6000,
  jours_travailles_an: 218,
  taux_facturable_pct: 70,
  heures_par_jour: 7,
};

export function rateCalculator(i: RateInputs) {
  const share = Math.min(Math.max(i.taux_charges_sociales_pct, 0), 90) / 100;
  const ca = i.revenu_net_annuel / (1 - share) + i.charges_fixes_annuelles;
  const days = (i.jours_travailles_an * i.taux_facturable_pct) / 100;
  const tjm = days > 0 ? ca / days : 0;
  return {
    ...i,
    chiffre_affaires_necessaire_ht: round(ca, 0),
    jours_facturables: round(days, 0),
    tjm_minimum_ht: round(tjm, 0),
    taux_horaire_minimum_ht: round(tjm / Math.max(i.heures_par_jour, 1), 0),
    ca_mensuel_cible_ht: round(ca / 12, 0),
  };
}

export const getRateInputs = () => ({ ...DEFAULT_RATE_INPUTS, ...getSetting<Partial<RateInputs>>("rate_inputs", {}) });
export const setRateInputs = (i: Partial<RateInputs>) => setSetting("rate_inputs", { ...getRateInputs(), ...i });

/** Alertes métier pour le tableau « Aujourd'hui ». */
export function sectorAlerts() {
  const s = getSector();
  if (s === "restaurant") {
    const o = restaurantOverview();
    return o.alertes.length ? [{ kind: "food_cost", names: o.alertes, target: o.target }] : [];
  }
  if (s === "ecommerce" || s === "dropshipping") {
    const o = productsOverview();
    const out: { kind: string; names: string[]; target?: number }[] = [];
    if (o.a_perte.length) out.push({ kind: "loss", names: o.a_perte });
    if (o.stock_bas.length) out.push({ kind: "stock", names: o.stock_bas.map((p) => `${p.name} (${p.stock})`) });
    return out;
  }
  return [];
}
