"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../../lib/supabase/client";
import { toggleFavorite, useFavorites } from "../../lib/favorites";
import { SELECT, fromDb, type DbProduct, type ShopProduct } from "../../lib/products";
import ProductCard from "../../components/ProductCard";

// Ce que renvoie Supabase : le favori + l'annonce liée (vide si l'annonce n'est plus visible)
type FavoriteRow = {
  product_id: string;
  products: DbProduct | DbProduct[] | null;
};

export default function WishlistPage() {
  const [supabase] = useState(() => createClient());
  const { ids, loaded } = useFavorites();

  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [items, setItems] = useState<ShopProduct[]>([]);
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [fetched, setFetched] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Charge mes favoris avec les annonces correspondantes (les règles RLS ne montrent que les annonces actives)
  const loadFavorites = useCallback(async () => {
    const { data, error } = await supabase
      .from("favorites")
      .select(`product_id, products(${SELECT})`)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Impossible de charger ta wishlist : " + error.message);
      setFetched(true);
      return;
    }

    const list: ShopProduct[] = [];
    const missing: string[] = [];
    ((data ?? []) as unknown as FavoriteRow[]).forEach((row) => {
      const product = Array.isArray(row.products) ? row.products[0] : row.products;
      if (product) list.push(fromDb(product));
      else missing.push(row.product_id);
    });
    setItems(list);
    setUnavailable(missing);
    setFetched(true);
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthChecked(true);
      if (data.user) loadFavorites();
      else setFetched(true);
    });
  }, [supabase, loadFavorites]);

  async function removeUnavailable(productId: string) {
    const result = await toggleFavorite(productId);
    if (result.ok) setUnavailable((list) => list.filter((id) => id !== productId));
    else if (result.reason === "error") setMessage("Suppression impossible : " + result.message);
  }

  if (!authChecked || !fetched || !loaded) {
    return <main className="mx-auto max-w-6xl px-4 py-12">Chargement…</main>;
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-3xl font-semibold">Wishlist</h1>
        <p className="mt-3">Connecte-toi pour retrouver les articles que tu as enregistrés.</p>
        <Link href="/login" className="btn btn-primary mt-4">Se connecter</Link>
      </main>
    );
  }

  // La liste suit les cœurs en direct : retirer un cœur ici fait disparaître la carte
  const visible = items.filter((p) => ids.has(p.id));

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold">Wishlist</h1>
      <p className="mt-1 text-sm text-muted">Les articles que tu as enregistrés avec le cœur ♡.</p>

      {message && <p role="alert" className="mt-4 text-sm">{message}</p>}

      {visible.length === 0 ? (
        <p className="mt-8">
          Ta wishlist est vide pour l&apos;instant.{" "}
          <Link href="/shop" className="underline">Découvre le shop</Link> et appuie sur le cœur des articles qui te plaisent.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {unavailable.length > 0 && (
        <section className="mt-10 rounded-2xl border border-line bg-surface p-4" aria-label="Articles indisponibles">
          <h2 className="font-semibold">Articles qui ne sont plus disponibles</h2>
          <p className="mt-1 text-sm text-muted">
            Ces annonces ont été vendues, mises en pause ou supprimées par leur vendeur.
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {unavailable.map((id) => (
              <li key={id} className="flex items-center justify-between gap-3">
                <span>Annonce indisponible</span>
                <button type="button" onClick={() => removeUnavailable(id)} className="underline">
                  Retirer de ma wishlist
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}