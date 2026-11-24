import { NextResponse } from "next/server";
import { authed } from "@/lib/auth";
import { currentTenant } from "@/lib/db";
import type { SectorId } from "@/lib/sector-info";
import {
  deleteIngredient,
  deleteProduct,
  deleteRecipe,
  getRateInputs,
  getSector,
  getTargets,
  productsOverview,
  rateCalculator,
  restaurantOverview,
  setRateInputs,
  setSector,
  setTargets,
  upsertIngredient,
  upsertProduct,
  upsertRecipe,
  type Product,
  type RateInputs,
} from "@/lib/sectors";

export const dynamic = "force-dynamic";

function GET_handler() {
  const sector = getSector();
  return NextResponse.json({
    sector,
    targets: getTargets(),
    restaurant: sector === "restaurant" ? restaurantOverview() : null,
    products: sector === "ecommerce" || sector === "dropshipping" ? productsOverview() : null,
    rates: sector === "services" ? rateCalculator(getRateInputs()) : null,
  });
}

type Body =
  | { action: "set_sector"; sector: SectorId }
  | { action: "set_targets"; foodCostPct?: number; netMarginPct?: number }
  | { action: "upsert_ingredient"; name: string; unit?: string; price_ht: number; waste_pct?: number; supplier?: string }
  | { action: "delete_ingredient"; id: number }
  | { action: "upsert_recipe"; name: string; category?: string; portions: number; price_ttc: number; vat_rate?: number; items: { ingredient: string; quantity: number }[] }
  | { action: "delete_recipe"; id: number }
  | ({ action: "upsert_product"; name: string } & Partial<Omit<Product, "id" | "name">>)
  | { action: "delete_product"; id: number }
  | ({ action: "set_rates" } & Partial<RateInputs>);

const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);

async function POST_handler(req: Request) {
  const b = (await req.json()) as Body;
  const bad = (m: string) => NextResponse.json({ error: m }, { status: 400 });
  try {
    switch (b.action) {
      case "set_sector":
        if (currentTenant().role !== "owner") return NextResponse.json({ error: "Réservé au propriétaire." }, { status: 403 });
        setSector(b.sector);
        break;
      case "set_targets":
        setTargets({
          ...(num(b.foodCostPct) && b.foodCostPct! > 0 && b.foodCostPct! < 100 ? { foodCostPct: b.foodCostPct } : {}),
          ...(num(b.netMarginPct) && b.netMarginPct! > -100 && b.netMarginPct! < 100 ? { netMarginPct: b.netMarginPct } : {}),
        });
        break;
      case "upsert_ingredient":
        if (!b.name?.trim() || !num(b.price_ht) || b.price_ht < 0) return bad("Nom et prix requis.");
        if (b.unit && !["kg", "L", "pièce"].includes(b.unit)) return bad("Unité invalide.");
        upsertIngredient(b);
        break;
      case "delete_ingredient":
        deleteIngredient(b.id);
        break;
      case "upsert_recipe":
        if (!b.name?.trim() || !num(b.portions) || b.portions <= 0 || !num(b.price_ttc)) return bad("Nom, portions et prix requis.");
        upsertRecipe({ ...b, items: (b.items ?? []).filter((i) => i.ingredient?.trim() && num(i.quantity) && i.quantity > 0) });
        break;
      case "delete_recipe":
        deleteRecipe(b.id);
        break;
      case "upsert_product": {
        if (!b.name?.trim()) return bad("Nom requis.");
        const { action, ...p } = b;
        void action;
        upsertProduct(p);
        break;
      }
      case "delete_product":
        deleteProduct(b.id);
        break;
      case "set_rates": {
        const { action, ...r } = b;
        void action;
        setRateInputs(Object.fromEntries(Object.entries(r).filter(([, v]) => num(v))) as Partial<RateInputs>);
        break;
      }
      default:
        return bad("Action inconnue.");
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return bad(err instanceof Error ? err.message : String(err));
  }
}

export const GET = authed("GET", GET_handler);
export const POST = authed("POST", POST_handler);
