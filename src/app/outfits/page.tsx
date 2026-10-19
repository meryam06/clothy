"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../../lib/supabase/client";

// ---------- Listes de choix ---//-------
const CATEGORIES = [
  { value: "tops", label: "Hauts" },
  { value: "bottoms", label: "Bas" },
  { value: "dresses", label: "Robes" },
  { value: "jackets", label: "Vestes et manteaux" },
  { value: "shoes", label: "Chaussures" },
  { value: "bags", label: "Sacs" },
  { value: "accessories", label: "Accessoires" },
];

const OCCASIONS = [
  { value: "university", label: "Université" },
  { value: "work", label: "Travail" },
  { value: "party", label: "Soirée" },
  { value: "wedding", label: "Mariage" },
  { value: "travel", label: "Voyage" },
  { value: "date", label: "Rendez-vous" },
  { value: "everyday", label: "Tous les jours" },
  { value: "other", label: "Autre" },
];

// Un vêtement (colonnes lues dans "wardrobe_items")
type WardrobeItem = {
  id: string;
  name: string;
  category: string;
  color: string | null;
  image_path: string | null;
};

// Une tenue (table "outfits") avec la liste de ses vêtements (table "outfit_items")
type Outfit = {
  id: string;
  name: string;
  occasion: string | null;
  notes: string | null;
  is_favorite: boolean;
  created_at: string;
  outfit_items: { wardrobe_item_id: string }[];
};

const inputClass = "w-full border bg-white px-3 py-2 text-sm text-black";

function labelOf(list: { value: string; label: string }[], value: string | null) {
  if (!value) return "";
  return list.find((x) => x.value === value)?.label ?? value;
}

export default function OutfitsPage() {
  const [supabase] = useState(() => createClient());

  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  // Formulaire
  const [name, setName] = useState("");
  const [occasion, setOccasion] = useState("");
  const [notes, setNotes] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [pickerFilter, setPickerFilter] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Charge ma garde-robe et mes tenues (la base ne renvoie que les MIENS grâce aux règles RLS)
  const loadAll = useCallback(async () => {
    const [itemsRes, outfitsRes] = await Promise.all([
      supabase
        .from("wardrobe_items")
        .select("id, name, category, color, image_path")
        .order("created_at", { ascending: false }),
      supabase
        .from("outfits")
        .select("id, name, occasion, notes, is_favorite, created_at, outfit_items(wardrobe_item_id)")
        .order("created_at", { ascending: false }),
    ]);

    if (itemsRes.error || outfitsRes.error) {
      setMessage(
        "Impossible de charger les données : " +
          (itemsRes.error?.message ?? outfitsRes.error?.message)
      );
      return;
    }

    const wardrobe = (itemsRes.data ?? []) as unknown as WardrobeItem[];
    setItems(wardrobe);
    setOutfits((outfitsRes.data ?? []) as unknown as Outfit[]);

    // Photos privées : liens temporaires (1 heure)
    const paths = wardrobe.map((i) => i.image_path).filter((p): p is string => !!p);
    if (paths.length === 0) {
      setImageUrls({});
      return;
    }
    const { data: signed } = await supabase.storage.from("wardrobe").createSignedUrls(paths, 3600);
    const map: Record<string, string> = {};
    signed?.forEach((s) => {
      if (s.path && s.signedUrl) map[s.path] = s.signedUrl;
    });
    setImageUrls(map);
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthChecked(true);
      if (data.user) loadAll();
    });
  }, [supabase, loadAll]);

  function toggleItem(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );
  }

  // Créer une tenue : 1) la tenue  2) ses vêtements
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (selected.length < 2) {
      setMessage("Choisis au moins 2 vêtements pour créer une tenue.");
      return;
    }

    setSaving(true);
    const { data: created, error } = await supabase
      .from("outfits")
      .insert({
        name: name.trim(),
        occasion: occasion || null,
        notes: notes.trim() || null,
      })
      .select("id")
      .single();

    if (error || !created) {
      setMessage("Création impossible : " + (error?.message ?? "erreur inconnue"));
      setSaving(false);
      return;
    }

    const rows = selected.map((wardrobe_item_id) => ({
      outfit_id: created.id,
      wardrobe_item_id,
    }));
    const { error: itemsError } = await supabase.from("outfit_items").insert(rows);

    if (itemsError) {
      // On supprime la tenue vide pour ne pas laisser de reste
      await supabase.from("outfits").delete().eq("id", created.id);
      setMessage("Impossible d'ajouter les vêtements : " + itemsError.message);
      setSaving(false);
      return;
    }

    setName("");
    setOccasion("");
    setNotes("");
    setSelected([]);
    setMessage("Tenue enregistrée.");
    await loadAll();
    setSaving(false);
  }

  async function toggleFavorite(outfit: Outfit) {
    const { error } = await supabase
      .from("outfits")
      .update({ is_favorite: !outfit.is_favorite })
      .eq("id", outfit.id);
    if (error) {
      setMessage("Modification impossible : " + error.message);
      return;
    }
    setOutfits((list) =>
      list.map((o) => (o.id === outfit.id ? { ...o, is_favorite: !o.is_favorite } : o))
    );
  }

  async function handleDelete(outfit: Outfit) {
    if (!window.confirm(`Supprimer la tenue « ${outfit.name} » ? (tes vêtements restent dans ta garde-robe)`)) return;
    const { error } = await supabase.from("outfits").delete().eq("id", outfit.id);
    if (error) {
      setMessage("Suppression impossible : " + error.message);
      return;
    }
    setOutfits((list) => list.filter((o) => o.id !== outfit.id));
  }

  // Enregistre dans l'historique que chaque vêtement de la tenue a été porté aujourd'hui
  async function markAsWorn(outfit: Outfit) {
    const rows = outfit.outfit_items.map((oi) => ({ wardrobe_item_id: oi.wardrobe_item_id }));
    const { error } = await supabase.from("wear_logs").insert(rows);
    setMessage(
      error
        ? "Enregistrement impossible : " + error.message
        : `« ${outfit.name} » est marquée comme portée aujourd'hui.`
    );
  }

  // ---------- Affichage ----------
  if (!authChecked) {
    return <main className="mx-auto max-w-6xl px-4 py-12">Chargement…</main>;
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-3xl font-bold">My Outfits</h1>
        <p className="mt-3">Tes tenues sont privées : connecte-toi pour les voir et les créer.</p>
        <Link href="/login" className="mt-4 inline-block border px-5 py-2">Se connecter</Link>
      </main>
    );
  }

  const itemById = new Map(items.map((i) => [i.id, i]));
  const pickerItems = pickerFilter ? items.filter((i) => i.category === pickerFilter) : items;
  const sortedOutfits = [...outfits].sort(
    (a, b) => Number(b.is_favorite) - Number(a.is_favorite)
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold">My Outfits</h1>
      <p className="mt-1 text-sm">Compose des tenues avec les vêtements que tu possèdes déjà.</p>

      {items.length < 2 ? (
        <p className="mt-6">
          Il te faut au moins 2 vêtements pour créer une tenue.{" "}
          <Link href="/wardrobe" className="underline">Ajoute-les dans ta garde-robe</Link>.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4 border p-4">
          <h2 className="text-xl font-semibold">Créer une tenue</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-sm">Nom de la tenue *</label>
              <input id="name" required value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Ex : Look université pluie" className={inputClass} />
            </div>
            <div>
              <label htmlFor="occasion" className="block text-sm">Occasion</label>
              <select id="occasion" value={occasion} onChange={(e) => setOccasion(e.target.value)}
                className={inputClass}>
                <option value="">Non précisée</option>
                {OCCASIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm">Notes (facultatif)</label>
            <input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)}
              className={inputClass} />
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm">
                Choisis tes vêtements ({selected.length} sélectionné{selected.length > 1 ? "s" : ""})
              </p>
              <select value={pickerFilter} onChange={(e) => setPickerFilter(e.target.value)}
                aria-label="Filtrer par catégorie" className="border bg-white px-3 py-2 text-sm text-black">
                <option value="">Toutes les catégories</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-3 md:grid-cols-6">
              {pickerItems.map((item) => {
                const isSelected = selected.includes(item.id);
                return (
                  <button key={item.id} type="button" onClick={() => toggleItem(item.id)}
                    aria-pressed={isSelected}
                    className={`p-1 text-left text-xs ${isSelected ? "border-4" : "border opacity-70"}`}>
                    {item.image_path && imageUrls[item.image_path] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrls[item.image_path]} alt={item.name}
                        className="aspect-square w-full object-cover" />
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center bg-gray-200 text-gray-500">
                        Pas de photo
                      </div>
                    )}
                    <span className="mt-1 block truncate">
                      {isSelected ? "✓ " : ""}{item.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <button type="submit" disabled={saving} className="border px-5 py-2">
            {saving ? "Enregistrement…" : "Enregistrer la tenue"}
          </button>
        </form>
      )}

      {message && <p role="status" className="mt-4 text-sm">{message}</p>}

      {/* ----- Mes tenues ----- */}
      <h2 className="mt-10 text-xl font-semibold">Mes tenues ({outfits.length})</h2>

      {outfits.length === 0 ? (
        <p className="mt-4">Aucune tenue pour l&apos;instant. Crée la première avec le formulaire ci-dessus.</p>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {sortedOutfits.map((outfit) => (
            <article key={outfit.id} className="border p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{outfit.name}</h3>
                  {outfit.occasion && (
                    <p className="text-xs">{labelOf(OCCASIONS, outfit.occasion)}</p>
                  )}
                </div>
                <button type="button" onClick={() => toggleFavorite(outfit)}
                  aria-pressed={outfit.is_favorite}
                  aria-label={outfit.is_favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                  className="text-xl">
                  {outfit.is_favorite ? "♥" : "♡"}
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {outfit.outfit_items.map((oi) => {
                  const item = itemById.get(oi.wardrobe_item_id);
                  if (!item) return null;
                  return (
                    <div key={oi.wardrobe_item_id} className="w-20 text-xs">
                      {item.image_path && imageUrls[item.image_path] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imageUrls[item.image_path]} alt={item.name}
                          className="aspect-square w-full object-cover" />
                      ) : (
                        <div className="flex aspect-square w-full items-center justify-center bg-gray-200 text-gray-500">
                          —
                        </div>
                      )}
                      <span className="block truncate">{item.name}</span>
                    </div>
                  );
                })}
              </div>

              {outfit.notes && <p className="mt-2 text-xs">{outfit.notes}</p>}

              <div className="mt-3 flex gap-4 text-xs">
                <button type="button" onClick={() => markAsWorn(outfit)} className="underline">
                  Portée aujourd&apos;hui
                </button>
                <button type="button" onClick={() => handleDelete(outfit)} className="underline">
                  Supprimer
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}