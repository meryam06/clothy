"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleFavorite, useFavorites } from "../lib/favorites";

// Le cœur est enregistré dans ta base : il reste rempli après un rechargement et sur tous tes appareils.
export default function FavoriteButton({ productId }: { productId: string }) {
  const router = useRouter();
  const { ids } = useFavorites();
  const [busy, setBusy] = useState(false);
  const active = ids.has(productId);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    const result = await toggleFavorite(productId);
    setBusy(false);
    // Pas connecté : on envoie vers la page de connexion
    if (!result.ok && result.reason === "login") router.push("/login");
  }

  return (
    <button
      type="button"
      aria-label={active ? "Retirer des favoris" : "Ajouter aux favoris"}
      aria-pressed={active}
      onClick={handleClick}
      className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-lg text-surface-ink shadow-sm hover:bg-surface"
    >
      {active ? "♥" : "♡"}
    </button>
  );
}