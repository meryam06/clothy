"use client";

import { useState } from "react";

// Pour l'instant le favori vit seulement dans le navigateur.
// Plus tard : on l'enregistrera dans la table "favorites" de Supabase.
export default function FavoriteButton() {
  const [active, setActive] = useState(false);

  return (
    <button
      type="button"
      aria-label={active ? "Retirer des favoris" : "Ajouter aux favoris"}
      aria-pressed={active}
      onClick={() => setActive(!active)}
      className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-lg text-black"
    >
      {active ? "♥" : "♡"}
    </button>
  );
}