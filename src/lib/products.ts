// src/lib/products.ts
// Lit les annonces ACTIVES dans Supabase (visibles par tout le monde) et les mélange
// avec les produits de démonstration, clairement marqués comme tels.

import { createClient } from "@supabase/supabase-js";
import { DEMO_PRODUCTS, type Condition } from "./demo-products";

// Mets false quand tu ne veux plus afficher les produits de démonstration
const SHOW_DEMO = true;

export type ShopProduct = {
  id: string;
  title: string;
  brand: string;
  price: number;
  currency: string;
  category: string;
  size: string;
  color: string;
  condition: Condition;
  seller: string;
  styles: string[];
  seasons: string[];
  isSecondHand: boolean;
  isNew: boolean;
  description: string;
  images: string[];
  hotspot?: { x: number; y: number }; // position (en %) de l'étiquette de prix sur la photo
  isDemo: boolean;
  verifiedBrand: boolean;
};

// Forme d'une ligne renvoyée par Supabase (avec les tables liées)
export type DbProduct = {
  id: string;
  title: string;
  description: string | null;
  brand_name: string | null;
  size: string | null;
  color: string | null;
  condition: Condition;
  price: number;
  currency: string;
  styles: string[] | null;
  seasons: string[] | null;
  created_at: string;
  brand_info_verified: boolean;
  categories: { name: string } | { name: string }[] | null;
  seller: { username: string | null; full_name: string | null } | { username: string | null; full_name: string | null }[] | null;
  product_images: { url: string; position: number }[] | null;
};

export const SELECT =
  "id, title, description, brand_name, size, color, condition, price, currency, styles, seasons, created_at, brand_info_verified, " +
  "categories(name), seller:profiles!products_seller_id_fkey(username, full_name), product_images(url, position)";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Client "visiteur" : il ne voit que ce que les règles de sécurité rendent public
function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

function first<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export function fromDb(p: DbProduct): ShopProduct {
  const seller = first(p.seller);
  // Pour protéger la vie privée, on affiche le pseudo, sinon seulement le prénom
  const sellerName = seller?.username || seller?.full_name?.split(" ")[0] || "Vendeur Clothy";
  const ageDays = (Date.now() - new Date(p.created_at).getTime()) / 86400000;
  return {
    id: p.id,
    title: p.title,
    brand: p.brand_name || "Marque non précisée",
    price: Number(p.price),
    currency: p.currency,
    category: first(p.categories)?.name ?? "Autre",
    size: p.size || "—",
    color: p.color || "—",
    condition: p.condition,
    seller: sellerName,
    styles: p.styles ?? [],
    seasons: p.seasons ?? [],
    isSecondHand: p.condition !== "new",
    isNew: ageDays <= 14,
    description: p.description || "Pas de description.",
    images: [...(p.product_images ?? [])].sort((a, b) => a.position - b.position).map((i) => i.url),
    isDemo: false,
    verifiedBrand: p.brand_info_verified,
  };
}

function demoProducts(): ShopProduct[] {
  if (!SHOW_DEMO) return [];
  return DEMO_PRODUCTS.map(({ images, seasons, ...p }) => ({
    ...p,
    seasons: seasons ?? [],
    images: images ?? [],
    isDemo: true,
    verifiedBrand: false,
  }));
}

// Toutes les annonces actives (les vraies d'abord), plus la démonstration
export async function getProducts(): Promise<ShopProduct[]> {
  let real: ShopProduct[] = [];
  try {
    const { data, error } = await getClient()
      .from("products")
      .select(SELECT)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) console.error("getProducts:", error.message);
    else real = ((data ?? []) as unknown as DbProduct[]).map(fromDb);
  } catch (err) {
    console.error("getProducts:", err);
  }
  return [...real, ...demoProducts()];
}

// Un produit par son identifiant (démo : "1".."8", vraie annonce : identifiant uuid)
export async function getProductById(id: string): Promise<ShopProduct | null> {
  if (/^\d+$/.test(id)) {
    return demoProducts().find((p) => p.id === id) ?? null;
  }
  if (!UUID_RE.test(id)) return null;
  try {
    const { data, error } = await getClient()
      .from("products")
      .select(SELECT)
      .eq("id", id)
      .eq("status", "active")
      .maybeSingle();
    if (error || !data) return null;
    return fromDb(data as unknown as DbProduct);
  } catch {
    return null;
  }
}