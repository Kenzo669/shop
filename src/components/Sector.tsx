"use client";

import { Fragment, useState } from "react";
import { AskButton, Stat, eur, postJson, usePoll } from "./shared";

type RecipeLine = { ingredient: string; quantity: number; unit: string; cost: number };
type Recipe = {
  id: number;
  name: string;
  category: string;
  portions: number;
  price_ttc: number;
  vat_rate: number;
  lines: RecipeLine[];
  cout_portion: number;
  prix_ht: number;
  marge_brute_portion: number;
  ratio_cout_matiere_pct: number | null;
  coefficient: number | null;
  prix_minimum_ttc: number;
  au_dessus_cible: boolean;
};
type Ingredient = { id: number; name: string; unit: string; price_ht: number; waste_pct: number; supplier: string | null };
type Product = {
  id: number;
  name: string;
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
  frais_paiement_commission: number;
  cout_direct: number;
  marge_nette: number;
  marge_nette_pct: number | null;
  cpa_max: number;
  roas_rentabilite: number | null;
  prix_minimum_ttc: number | null;
  a_perte: boolean;
  stock_bas: boolean;
};
type Rates = {
  revenu_net_annuel: number;
  taux_charges_sociales_pct: number;
  charges_fixes_annuelles: number;
  jours_travailles_an: number;
  taux_facturable_pct: number;
  heures_par_jour: number;
  chiffre_affaires_necessaire_ht: number;
  jours_facturables: number;
  tjm_minimum_ht: number;
  taux_horaire_minimum_ht: number;
  ca_mensuel_cible_ht: number;
};
type SectorData = {
  sector: string;
  targets: { foodCostPct: number; netMarginPct: number };
  restaurant: { recipes: Recipe[]; ingredients: Ingredient[]; moyenne_cout_matiere_pct: number | null; alertes: string[] } | null;
  products: { products: Product[]; a_perte: string[]; sous_cible: string[]; stock_bas: { name: string }[] } | null;
  rates: Rates | null;
};

type OnAsked = (taskId: number, agentId: string) => void;

const act = (body: object) => postJson("/api/sector", body);
const fr = (n: number, d = 1) => n.toLocaleString("fr-FR", { maximumFractionDigits: d });
const pct = (n: number | null) => (n === null ? "—" : `${fr(n)} %`);
const pctTone = (v: number | null, target: number, higherIsBad: boolean) =>
  v === null ? "" : (higherIsBad ? v > target : v < target) ? "text-red-600 font-semibold" : "text-emerald-700";

export default function SectorPanel({ onAsked }: { onAsked: OnAsked }) {
  const [d, reload] = usePoll<SectorData>("/api/sector", 8000);
  if (!d) return <p className="text-sm text-gray-500">Chargement…</p>;
  if (d.restaurant) return <RestaurantView d={d} reload={reload} onAsked={onAsked} />;
  if (d.products) return <ProductsView d={d} reload={reload} onAsked={onAsked} dropshipping={d.sector === "dropshipping"} />;
  if (d.rates) return <RatesView rates={d.rates} reload={reload} onAsked={onAsked} />;
  return null;
}

function Target({ label, value, onSave }: { label: string; value: number; onSave: (v: number) => Promise<void> }) {
  const [v, setV] = useState(value);
  return (
    <label className="flex items-center gap-2 text-xs text-gray-600">
      {label}
      <input type="number" className="w-16 rounded border p-1 text-sm" value={v} onChange={(e) => setV(Number(e.target.value))} onBlur={() => v !== value && onSave(v)} />%
    </label>
  );
}

// ------------------------------------------------------------------ Restaurant

function RestaurantView({ d, reload, onAsked }: { d: SectorData; reload: () => void; onAsked: OnAsked }) {
  const r = d.restaurant!;
  const target = d.targets.foodCostPct;
  const [editing, setEditing] = useState<Recipe | "new" | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Plats à la carte" value={String(r.recipes.length)} />
        <Stat
          label="Coût matière moyen"
          value={pct(r.moyenne_cout_matiere_pct)}
          tone={r.moyenne_cout_matiere_pct !== null && r.moyenne_cout_matiere_pct > target ? "bad" : "good"}
        />
        <Stat label="Plats au-dessus de la cible" value={String(r.alertes.length)} tone={r.alertes.length ? "bad" : undefined} />
        <Stat label="Ingrédients suivis" value={String(r.ingredients.length)} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-semibold text-white" onClick={() => setEditing("new")}>
          + Fiche technique
        </button>
        <Target label="Cible coût matière" value={target} onSave={async (v) => { await act({ action: "set_targets", foodCostPct: v }); reload(); }} />
        {r.alertes.length > 0 && (
          <AskButton
            agentId="compta"
            label={r.alertes.length > 1 ? `Marc optimise les ${r.alertes.length} plats trop chers` : "Marc optimise le plat trop cher"}
            className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100"
            instruction={`Ces plats dépassent la cible de ${target} % de coût matière : ${r.alertes.join(", ")}. Pour chacun, propose 2 options chiffrées (nouveau prix de vente, ou ajustement de recette ou de portion) et enregistre un récapitulatif.`}
            onAsked={onAsked}
          />
        )}
      </div>
      {editing && (
        <RecipeForm
          recipe={editing === "new" ? null : editing}
          ingredients={r.ingredients}
          onDone={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
      {r.recipes.length === 0 ? (
        <p className="rounded-lg bg-slate-50 p-4 text-sm text-gray-600">
          Ajoutez vos ingrédients (prix d&apos;achat et pertes), puis vos plats : le coût de revient de chaque portion se calcule tout seul.
          Vous pouvez aussi demander à Marc : « Voici ma recette de burger… ».
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-gray-500">
              <tr>
                <th className="p-2">Plat</th>
                <th className="p-2 text-right">Prix TTC</th>
                <th className="p-2 text-right">Coût portion</th>
                <th className="p-2 text-right">Coût matière</th>
                <th className="p-2 text-right">Coef.</th>
                <th className="p-2 text-right">Marge brute</th>
                <th className="p-2 text-right" title={`Prix TTC minimum pour ne pas dépasser ${target} % de coût matière`}>Prix minimum</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {r.recipes.map((x) => (
                <Fragment key={x.id}>
                  <tr className={`cursor-pointer hover:bg-slate-50 ${x.au_dessus_cible ? "bg-red-50/50" : ""}`} onClick={() => setOpen(open === x.id ? null : x.id)}>
                    <td className="p-2">
                      <div className="font-medium">{x.name}</div>
                      <div className="text-xs text-gray-400">{x.category} · {x.portions} portion(s)</div>
                    </td>
                    <td className="p-2 text-right">{eur(x.price_ttc)}</td>
                    <td className="p-2 text-right">{eur(x.cout_portion)}</td>
                    <td className={`p-2 text-right ${pctTone(x.ratio_cout_matiere_pct, target, true)}`}>
                      {pct(x.ratio_cout_matiere_pct)}
                    </td>
                    <td className="p-2 text-right">{x.coefficient === null ? "—" : fr(x.coefficient, 2)}</td>
                    <td className="p-2 text-right">{eur(x.marge_brute_portion)}</td>
                    <td className={`p-2 text-right ${x.au_dessus_cible ? "font-semibold text-red-600" : "text-gray-400"}`}>{eur(x.prix_minimum_ttc)}</td>
                    <td className="p-2 text-right">
                      <button className="text-xs text-slate-600 hover:underline" onClick={(e) => { e.stopPropagation(); setEditing(x); }}>
                        Modifier
                      </button>
                    </td>
                  </tr>
                  {open === x.id && (
                    <tr className="bg-slate-50/60">
                      <td colSpan={8} className="p-2 text-xs">
                        {x.lines.map((l) => (
                          <span key={l.ingredient} className="mr-4 inline-block">
                            {l.ingredient} : {l.quantity} {l.unit} → <strong>{eur(l.cost)}</strong>
                          </span>
                        ))}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Ingredients ingredients={r.ingredients} reload={reload} />
    </div>
  );
}

function RecipeForm({ recipe, ingredients, onDone }: { recipe: Recipe | null; ingredients: Ingredient[]; onDone: () => void }) {
  const [f, setF] = useState({
    name: recipe?.name ?? "",
    category: recipe?.category ?? "Plat",
    portions: recipe?.portions ?? 1,
    price_ttc: recipe?.price_ttc ?? 0,
    vat_rate: recipe?.vat_rate ?? 10,
  });
  const [items, setItems] = useState(recipe?.lines.map((l) => ({ ingredient: l.ingredient, quantity: l.quantity })) ?? [{ ingredient: ingredients[0]?.name ?? "", quantity: 0 }]);
  const [err, setErr] = useState<string | null>(null);
  const unitOf = (n: string) => ingredients.find((i) => i.name === n)?.unit ?? "";
  return (
    <div className="space-y-2 rounded-lg border bg-slate-50 p-3 text-sm">
      {!ingredients.length && <p className="text-xs text-amber-700">Ajoutez d&apos;abord des ingrédients (tableau plus bas).</p>}
      <div className="grid gap-2 sm:grid-cols-[1fr_130px_90px_110px_90px]">
        <input className="rounded border p-2" placeholder="Nom du plat" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <select className="rounded border p-2" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
          {["Entrée", "Plat", "Dessert", "Boisson", "Menu", "Autre"].map((c) => <option key={c}>{c}</option>)}
        </select>
        <input className="rounded border p-2" type="number" min={1} value={f.portions} onChange={(e) => setF({ ...f, portions: Number(e.target.value) })} title="Portions" aria-label="Portions" />
        <input className="rounded border p-2" type="number" step="0.1" value={f.price_ttc} onChange={(e) => setF({ ...f, price_ttc: Number(e.target.value) })} title="Prix TTC" aria-label="Prix de vente TTC" />
        <select className="rounded border p-2" value={f.vat_rate} onChange={(e) => setF({ ...f, vat_rate: Number(e.target.value) })} aria-label="TVA">
          {[10, 5.5, 20].map((v) => <option key={v} value={v}>TVA {v} %</option>)}
        </select>
      </div>
      <div className="text-xs text-gray-500">Ingrédients pour toute la recette ({f.portions} portion(s)) :</div>
      {items.map((it, i) => (
        <div key={i} className="grid grid-cols-[1fr_110px_50px_24px] items-center gap-2">
          <select className="rounded border p-1.5" value={it.ingredient} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, ingredient: e.target.value } : x)))}>
            {ingredients.map((g) => <option key={g.id}>{g.name}</option>)}
          </select>
          <input className="rounded border p-1.5" type="number" step="0.001" value={it.quantity} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, quantity: Number(e.target.value) } : x)))} aria-label="Quantité" />
          <span className="text-xs text-gray-500">{unitOf(it.ingredient)}</span>
          <button className="text-gray-400 hover:text-red-600" onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label="Retirer">✕</button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <button className="text-xs underline" onClick={() => setItems([...items, { ingredient: ingredients[0]?.name ?? "", quantity: 0 }])}>+ ingrédient</button>
        <button
          className="ml-auto rounded-md bg-emerald-600 px-3 py-1.5 font-semibold text-white"
          onClick={async () => {
            try {
              await act({ action: "upsert_recipe", ...f, items });
              onDone();
            } catch (e) {
              setErr(e instanceof Error ? e.message : String(e));
            }
          }}
        >
          Enregistrer
        </button>
        {recipe && (
          <button className="text-xs text-red-600" onClick={async () => { if (confirm(`Supprimer ${recipe.name} ?`)) { await act({ action: "delete_recipe", id: recipe.id }); onDone(); } }}>
            Supprimer
          </button>
        )}
        <button className="text-xs text-gray-500" onClick={onDone}>Annuler</button>
      </div>
      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  );
}

function Ingredients({ ingredients, reload }: { ingredients: Ingredient[]; reload: () => void }) {
  const [f, setF] = useState({ name: "", unit: "kg", price_ht: 0, waste_pct: 0, supplier: "" });
  const [err, setErr] = useState<string | null>(null);
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">Ingrédients et prix d&apos;achat</h3>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
        <input className="w-44 rounded border p-1.5" placeholder="Ingrédient" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className="w-24 rounded border p-1.5" type="number" step="0.01" value={f.price_ht} onChange={(e) => setF({ ...f, price_ht: Number(e.target.value) })} aria-label="Prix HT" title="Prix d'achat HT" />
        € HT /
        <select className="rounded border p-1.5" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })}>
          <option>kg</option>
          <option>L</option>
          <option>pièce</option>
        </select>
        perte
        <input className="w-16 rounded border p-1.5" type="number" value={f.waste_pct} onChange={(e) => setF({ ...f, waste_pct: Number(e.target.value) })} aria-label="Perte %" />%
        <input className="w-36 rounded border p-1.5" placeholder="Fournisseur" value={f.supplier} onChange={(e) => setF({ ...f, supplier: e.target.value })} />
        <button
          className="rounded-md bg-slate-800 px-3 py-1.5 text-white disabled:opacity-40"
          disabled={!f.name.trim()}
          onClick={async () => {
            try {
              await act({ action: "upsert_ingredient", ...f, supplier: f.supplier || undefined });
              setF({ name: "", unit: f.unit, price_ht: 0, waste_pct: 0, supplier: "" });
              setErr(null);
              reload();
            } catch (e) {
              setErr(e instanceof Error ? e.message : String(e));
            }
          }}
        >
          Ajouter / mettre à jour
        </button>
      </div>
      {err && <p className="text-xs text-red-600">{err}</p>}
      {ingredients.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-gray-500">
              <tr>
                <th className="p-1">Ingrédient</th>
                <th className="p-1 text-right">Prix d&apos;achat HT</th>
                <th className="p-1 text-right">Perte</th>
                <th className="p-1 text-right" title="Prix réel d'une unité utilisable, pertes déduites">Coût utile</th>
                <th className="p-1">Fournisseur</th>
                <th className="p-1"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ingredients.map((i) => (
                <tr key={i.id}>
                  <td className="p-1">{i.name}</td>
                  <td className="p-1 text-right">{eur(i.price_ht)} / {i.unit}</td>
                  <td className="p-1 text-right">{fr(i.waste_pct)} %</td>
                  <td className="p-1 text-right">{eur(i.price_ht / (1 - i.waste_pct / 100))} / {i.unit}</td>
                  <td className="p-1 text-gray-500">{i.supplier ?? ""}</td>
                  <td className="p-1 text-right">
                    <button
                      className="text-xs text-gray-400 hover:text-red-600"
                      onClick={async () => {
                        try {
                          await act({ action: "delete_ingredient", id: i.id });
                          reload();
                        } catch (e) {
                          setErr(e instanceof Error ? e.message : String(e));
                        }
                      }}
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ E-commerce / dropshipping

const PRODUCT_FORM_FIELDS: { key: keyof Product; label: string; step?: string; stockOnly?: boolean }[] = [
  { key: "cost_ht", label: "Prix d'achat HT" },
  { key: "shipping_cost", label: "Livraison / vente" },
  { key: "packaging_cost", label: "Emballage" },
  { key: "payment_pct", label: "Frais paiement %" },
  { key: "payment_fixed", label: "Frais fixes" },
  { key: "marketplace_pct", label: "Commission %" },
  { key: "ad_cost", label: "Coût pub / vente" },
  { key: "price_ttc", label: "Prix de vente TTC" },
  { key: "vat_rate", label: "TVA %" },
  { key: "stock", label: "Stock", step: "1", stockOnly: true },
  { key: "reorder_level", label: "Seuil de réassort", step: "1", stockOnly: true },
];

function ProductsView({ d, reload, onAsked, dropshipping }: { d: SectorData; reload: () => void; onAsked: OnAsked; dropshipping: boolean }) {
  const p = d.products!;
  const target = d.targets.netMarginPct;
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Produits" value={String(p.products.length)} />
        <Stat label="Vendus à perte" value={String(p.a_perte.length)} tone={p.a_perte.length ? "bad" : "good"} />
        <Stat label={`Sous ${target} % de marge`} value={String(p.sous_cible.length)} tone={p.sous_cible.length ? "warn" : undefined} />
        {dropshipping ? (
          <Stat label="CPA max moyen" value={p.products.length ? eur(p.products.reduce((t, x) => t + x.cpa_max, 0) / p.products.length) : "—"} />
        ) : (
          <Stat label="Stocks bas" value={String(p.stock_bas.length)} tone={p.stock_bas.length ? "warn" : undefined} />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-semibold text-white" onClick={() => setEditing("new")}>
          + Produit
        </button>
        <Target label="Marge nette cible" value={target} onSave={async (v) => { await act({ action: "set_targets", netMarginPct: v }); reload(); }} />
        {p.products.length > 0 && (
          <AskButton
            agentId="compta"
            label="Marc analyse mes marges"
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
            instruction={
              dropshipping
                ? "Analyse la rentabilité de tous mes produits avec products_margins : pour chacun, donne le CPA maximal et le ROAS minimal à viser, signale ceux à arrêter ou à augmenter, et enregistre un récapitulatif."
                : "Analyse la rentabilité de tous mes produits avec products_margins : signale ceux vendus à perte ou sous la marge cible avec un prix conseillé, liste les réassorts à faire, et enregistre un récapitulatif."
            }
            onAsked={onAsked}
          />
        )}
      </div>
      {editing && <ProductForm product={editing === "new" ? null : editing} dropshipping={dropshipping} onDone={() => { setEditing(null); reload(); }} />}
      {p.products.length === 0 ? (
        <p className="rounded-lg bg-slate-50 p-4 text-sm text-gray-600">
          Ajoutez vos produits avec leurs coûts : la marge nette de chaque vente, {dropshipping ? "le CPA maximal et le ROAS de rentabilité" : "les alertes de stock"} se calculent tout seuls.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-gray-500">
              <tr>
                <th className="p-2">Produit</th>
                <th className="p-2 text-right">Prix TTC</th>
                <th className="p-2 text-right" title="Achat + livraison + emballage">Coût direct</th>
                <th className="p-2 text-right">Frais</th>
                <th className="p-2 text-right">Pub / vente</th>
                <th className="p-2 text-right">Marge nette</th>
                <th className="p-2 text-right" title="Coût publicitaire maximal par vente avant de perdre de l'argent">CPA max</th>
                <th className="p-2 text-right" title="Chiffre d'affaires TTC / dépense pub minimal pour être rentable">ROAS mini</th>
                <th className="p-2 text-right" title={`Prix TTC minimum pour ${target} % de marge nette`}>Prix minimum</th>
                {!dropshipping && <th className="p-2 text-right">Stock</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {p.products.map((x) => (
                <tr key={x.id} className={`cursor-pointer hover:bg-slate-50 ${x.a_perte ? "bg-red-50/60" : ""}`} onClick={() => setEditing(x)}>
                  <td className="p-2">
                    <div className="font-medium">{x.name}</div>
                    {x.supplier && <div className="text-xs text-gray-400">{x.supplier}</div>}
                  </td>
                  <td className="p-2 text-right">{eur(x.price_ttc)}</td>
                  <td className="p-2 text-right">{eur(x.cout_direct)}</td>
                  <td className="p-2 text-right">{eur(x.frais_paiement_commission)}</td>
                  <td className="p-2 text-right">{eur(x.ad_cost)}</td>
                  <td className={`p-2 text-right ${pctTone(x.marge_nette_pct, target, false)}`}>
                    {eur(x.marge_nette)}
                    <div className="text-xs">{x.marge_nette_pct === null ? "" : pct(x.marge_nette_pct)}</div>
                  </td>
                  <td className="p-2 text-right">{eur(x.cpa_max)}</td>
                  <td className="p-2 text-right">{x.roas_rentabilite === null ? "∞" : fr(x.roas_rentabilite, 2)}</td>
                  <td
                    className={`p-2 text-right ${x.prix_minimum_ttc !== null && x.prix_minimum_ttc > x.price_ttc ? "font-semibold text-red-600" : "text-gray-400"}`}
                  >
                    {x.prix_minimum_ttc === null ? "—" : eur(x.prix_minimum_ttc)}
                  </td>
                  {!dropshipping && (
                    <td className={`p-2 text-right ${x.stock_bas ? "font-semibold text-amber-700" : ""}`}>{x.stock ?? "—"}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-gray-500">
        Marge nette = prix HT − achat − livraison − emballage − frais de paiement et commissions (calculés sur le TTC) − pub. ROAS mini = prix TTC ÷ marge avant pub.
        Prix minimum = prix TTC à ne pas descendre pour garder la marge cible (en rouge quand votre prix actuel est en dessous).
      </p>
    </div>
  );
}

function ProductForm({ product, dropshipping, onDone }: { product: Product | null; dropshipping: boolean; onDone: () => void }) {
  const [name, setName] = useState(product?.name ?? "");
  const [supplier, setSupplier] = useState(product?.supplier ?? "");
  const [v, setV] = useState<Record<string, number | null>>(
    Object.fromEntries(
      PRODUCT_FORM_FIELDS.map((f) => [
        f.key,
        product ? (product[f.key] as number | null) : ({ payment_pct: 1.5, payment_fixed: 0.25, vat_rate: 20 } as Record<string, number>)[f.key] ?? (f.stockOnly ? null : 0),
      ]),
    ),
  );
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="space-y-2 rounded-lg border bg-slate-50 p-3 text-sm">
      <div className="grid gap-2 sm:grid-cols-2">
        <input className="rounded border p-2" placeholder="Nom du produit" value={name} onChange={(e) => setName(e.target.value)} disabled={!!product} />
        <input className="rounded border p-2" placeholder="Fournisseur" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {PRODUCT_FORM_FIELDS.filter((f) => !(dropshipping && f.stockOnly)).map((f) => (
          <label key={f.key} className="text-xs text-gray-600">
            {f.label}
            <input
              type="number"
              step={f.step ?? "0.01"}
              className="mt-0.5 w-full rounded border p-1.5 text-sm"
              value={v[f.key] ?? ""}
              onChange={(e) => setV({ ...v, [f.key]: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          className="rounded-md bg-emerald-600 px-3 py-1.5 font-semibold text-white disabled:opacity-40"
          disabled={!name.trim()}
          onClick={async () => {
            try {
              const fields = Object.fromEntries(Object.entries(v).filter(([, x]) => x !== null));
              await act({ action: "upsert_product", name, supplier: supplier || undefined, ...fields });
              onDone();
            } catch (e) {
              setErr(e instanceof Error ? e.message : String(e));
            }
          }}
        >
          Enregistrer
        </button>
        {product && (
          <button className="text-xs text-red-600" onClick={async () => { if (confirm(`Supprimer ${product.name} ?`)) { await act({ action: "delete_product", id: product.id }); onDone(); } }}>
            Supprimer
          </button>
        )}
        <button className="text-xs text-gray-500" onClick={onDone}>Annuler</button>
        {err && <span className="text-xs text-red-600">{err}</span>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Services / freelance

const RATE_FIELDS: { key: keyof Rates; label: string; suffix: string }[] = [
  { key: "revenu_net_annuel", label: "Revenu net souhaité par an", suffix: "€" },
  { key: "taux_charges_sociales_pct", label: "Cotisations et impôts (part du CA)", suffix: "%" },
  { key: "charges_fixes_annuelles", label: "Charges fixes par an (logiciels, local, comptable…)", suffix: "€" },
  { key: "jours_travailles_an", label: "Jours travaillés par an", suffix: "j" },
  { key: "taux_facturable_pct", label: "Part des jours facturés aux clients", suffix: "%" },
  { key: "heures_par_jour", label: "Heures par jour", suffix: "h" },
];

function RatesView({ rates, reload, onAsked }: { rates: Rates; reload: () => void; onAsked: OnAsked }) {
  const [v, setV] = useState(Object.fromEntries(RATE_FIELDS.map((f) => [f.key, rates[f.key] as number])));
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="space-y-2">
        {RATE_FIELDS.map((f) => (
          <label key={f.key} className="flex items-center gap-3 text-sm">
            <span className="flex-1 text-gray-700">{f.label}</span>
            <input
              type="number"
              className="w-28 rounded border p-1.5 text-right"
              value={v[f.key]}
              onChange={(e) => setV({ ...v, [f.key]: Number(e.target.value) })}
              onBlur={async () => {
                await act({ action: "set_rates", ...v });
                reload();
              }}
            />
            <span className="w-4 text-gray-400">{f.suffix}</span>
          </label>
        ))}
        <p className="pt-2 text-xs text-gray-500">
          Repères : environ 22 à 25 % de cotisations en micro-entreprise (services), 40 à 50 % en société en tenant compte de l&apos;impôt.
          Comptez 60 à 75 % de jours facturés : le reste part en prospection, administratif et formation.
        </p>
      </div>
      <div className="space-y-2">
        <div className="rounded-xl bg-slate-900 p-4 text-white">
          <div className="text-xs text-slate-300">Taux journalier minimum (HT)</div>
          <div className="text-3xl font-bold">{eur(rates.tjm_minimum_ht)}</div>
          <div className="mt-1 text-sm text-slate-300">soit {eur(rates.taux_horaire_minimum_ht)} de l&apos;heure</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="CA annuel nécessaire" value={eur(rates.chiffre_affaires_necessaire_ht)} />
          <Stat label="CA mensuel cible" value={eur(rates.ca_mensuel_cible_ht)} />
          <Stat label="Jours facturables / an" value={String(rates.jours_facturables)} />
        </div>
        <AskButton
          agentId="compta"
          label="Marc vérifie mes devis et mes prix"
          className="w-full rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
          instruction="Compare mes factures et devis récents à mon TJM minimum (rate_calculator) : signale les prestations sous-facturées et propose une grille tarifaire (journée, demi-journée, forfaits) enregistrée en fichier."
          onAsked={onAsked}
        />
      </div>
    </div>
  );
}
