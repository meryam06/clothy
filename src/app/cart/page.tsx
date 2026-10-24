"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../../lib/supabase/client";
import { clearCart, removeFromCart, useCart } from "../../lib/cart";

const inputClass = "field";

export default function CartPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const items = useCart();

  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Adresse de livraison (envoyée seulement au vendeur de la commande)
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");

  const [placing, setPlacing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthChecked(true);
    });
  }, [supabase]);

  const currencies = Array.from(new Set(items.map((i) => i.currency)));
  const mixedCurrencies = currencies.length > 1;
  const total = items.reduce((sum, i) => sum + i.price, 0);

  async function handleOrder(e: FormEvent) {
    e.preventDefault();
    if (!user || items.length === 0 || mixedCurrencies) return;
    setPlacing(true);
    setMessage(null);

    // Les prix ne sont PAS envoyés : la base les relit elle-même dans les annonces
    const { error } = await supabase.rpc("place_order", {
      p_product_ids: items.map((i) => i.id),
      p_shipping: {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
      },
    });

    if (error) {
      setMessage(error.message);
      setPlacing(false);
      return;
    }

    clearCart();
    router.push("/orders");
  }

  if (!authChecked) {
    return <main className="mx-auto max-w-4xl px-4 py-12">Chargement…</main>;
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold">Panier</h1>

      {items.length === 0 ? (
        <p className="mt-4">
          Ton panier est vide. <Link href="/shop" className="underline">Découvre le shop</Link>.
        </p>
      ) : (
        <>
          <ul className="mt-6 space-y-3">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-3">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt={item.title} className="h-20 w-16 object-cover" />
                ) : (
                  <div className="flex h-20 w-16 items-center justify-center bg-line text-xs text-muted">—</div>
                )}
                <div className="flex-1">
                  <Link href={`/shop/${item.id}`} className="font-semibold underline">{item.title}</Link>
                  <p className="text-xs">Vendeur : {item.seller}</p>
                </div>
                <p className="font-semibold">{item.price} {item.currency}</p>
                <button type="button" onClick={() => removeFromCart(item.id)} className="text-xs underline">
                  Retirer
                </button>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-right text-lg font-bold">
            Total : {total} {currencies[0]}
          </p>
          {mixedCurrencies && (
            <p role="alert" className="mt-2 text-sm">
              Ton panier contient des devises différentes : retire des articles pour continuer.
            </p>
          )}

          <p className="mt-6 rounded-xl border border-line bg-surface p-3 text-sm">
            Mode démonstration : aucun vrai paiement n&apos;est effectué. La commande est enregistrée comme « payée (simulation) ».
          </p>

          {!user ? (
            <p className="mt-6">
              <Link href="/login" className="underline">Connecte-toi</Link> pour passer la commande.
            </p>
          ) : (
            <form onSubmit={handleOrder} className="mt-6 grid gap-4 rounded-2xl border border-line bg-surface p-4 md:grid-cols-2">
              <h2 className="text-xl font-semibold md:col-span-2">Livraison</h2>
              <div>
                <label htmlFor="name" className="block text-sm">Nom complet *</label>
                <input id="name" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm">Téléphone *</label>
                <input id="phone" required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="address" className="block text-sm">Adresse *</label>
                <input id="address" required value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="city" className="block text-sm">Ville *</label>
                <input id="city" required value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
              </div>
              <p className="text-xs md:col-span-2">
                Ces informations sont visibles uniquement par le vendeur, pour préparer l&apos;expédition.
              </p>
              <div className="md:col-span-2">
                <button type="submit" disabled={placing || mixedCurrencies} className="btn btn-primary">
                  {placing ? "Commande en cours…" : "Passer la commande (simulation)"}
                </button>
              </div>
            </form>
          )}

          {message && (
            <div role="alert" className="mt-4 text-sm">
              <p>{message}</p>
              <button type="button" onClick={() => clearCart()} className="mt-2 underline">
                Vider le panier
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}