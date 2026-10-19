
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../../lib/supabase/client";

// ---------- Listes de choix (les valeurs doivent correspondre à la base de données) ----------
const CATEGORIES = [
  { value: "tops", label: "Hauts" },
  { value: "bottoms", label: "Bas" },
  { value: "dresses", label: "Robes" },
  { value: "jackets", label: "Vestes et manteaux" },
  { value: "shoes", label: "Chaussures" },
  { value: "bags", label: "Sacs" },
  { value: "accessories", label: "Accessoires" },
];

const SEASONS = [
  { value: "spring", label: "Printemps" },
  { value: "summer", label: "Été" },
  { value: "autumn", label: "Automne" },
  { value: "winter", label: "Hiver" },
];

// Un vêtement tel qu'il est stocké dans la table "wardrobe_items"
type WardrobeItem = {
  id: string;
  name: string;
  category: string;
  color: string | null;
  brand: string | null;
  size: string | null;
  seasons: string[];
  waterproof: boolean;
  warmth_level: number | null;
  image_path: string | null;
  created_at: string;
};

const MAX_PHOTO_MB = 5;
const inputClass = "w-full border bg-white px-3 py-2 text-sm text-black";

function labelOf(list: { value: string; label: string }[], value: string) {
  return list.find((x) => x.value === value)?.label ?? value;
}

export default function WardrobePage() {
  const [supabase] = useState(() => createClient());

  // --- Utilisateur ---
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // --- Liste des vêtements ---
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("");

  // --- Formulaire ---
  const [name, setName] = useState("");
  const [category, setCategory] = useState("tops");
  const [color, setColor] = useState("");
  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("");
  const [seasons, setSeasons] = useState<string[]>([]);
  const [waterproof, setWaterproof] = useState(false);
  const [warmth, setWarmth] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0); // sert à vider le champ photo

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Charge les vêtements de l'utilisateur (la base ne renvoie que les SIENS grâce aux règles RLS)
  const loadItems = useCallback(async () => {
    const { data, error } = await supabase
      .from("wardrobe_items")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Impossible de charger ta garde-robe : " + error.message);
      return;
    }

    const list = (data ?? []) as WardrobeItem[];
    setItems(list);

    // Le dossier "wardrobe" est PRIVÉ : on demande des liens temporaires (1 heure) pour afficher les photos
    const paths = list.map((i) => i.image_path).filter((p): p is string => !!p);
    if (paths.length === 0) {
      setImageUrls({});
      return;
    }
    const { data: signed } = await supabase.storage
      .from("wardrobe")
      .createSignedUrls(paths, 3600);
    const map: Record<string, string> = {};
    signed?.forEach((s) => {
      if (s.path && s.signedUrl) map[s.path] = s.signedUrl;
    });
    setImageUrls(map);
  }, [supabase]);

  // Au chargement de la page : qui est connecté ? puis charger ses vêtements
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthChecked(true);
      if (data.user) loadItems();
    });
  }, [supabase, loadItems]);

  function toggleSeason(value: string) {
    setSeasons((current) =>
      current.includes(value) ? current.filter((s) => s !== value) : [...current, value]
    );
  }

  function resetForm() {
    setName("");
    setCategory("tops");
    setColor("");
    setBrand("");
    setSize("");
    setSeasons([]);
    setWaterproof(false);
    setWarmth("");
    setFile(null);
    setFileInputKey((k) => k + 1);
  }

  // Ajouter un vêtement : 1) envoyer la photo  2) créer la ligne dans la table
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage(null);

    let imagePath: string | null = null;

    if (file) {
      if (!file.type.startsWith("image/")) {
        setMessage("Le fichier doit être une image (jpg, png, webp…).");
        setSaving(false);
        return;
      }
      if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
        setMessage(`La photo est trop lourde (maximum ${MAX_PHOTO_MB} Mo).`);
        setSaving(false);
        return;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      // Le 1er dossier du chemin = ton id : c'est ce que la règle de sécurité vérifie
      imagePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("wardrobe")
        .upload(imagePath, file);
      if (uploadError) {
        setMessage("Envoi de la photo impossible : " + uploadError.message);
        setSaving(false);
        return;
      }
    }

    const { error: insertError } = await supabase.from("wardrobe_items").insert({
      name: name.trim(),
      category,
      color: color.trim() || null,
      brand: brand.trim() || null,
      size: size.trim() || null,
      seasons,
      waterproof,
      warmth_level: warmth ? Number(warmth) : null,
      image_path: imagePath,
    });

    if (insertError) {
      // On supprime la photo déjà envoyée pour ne pas laisser de fichier orphelin
      if (imagePath) await supabase.storage.from("wardrobe").remove([imagePath]);
      setMessage("Ajout impossible : " + insertError.message);
      setSaving(false);
      return;
    }

    resetForm();
    setMessage("Vêtement ajouté à ta garde-robe.");
    await loadItems();
    setSaving(false);
  }

  async function handleDelete(item: WardrobeItem) {
    if (!window.confirm(`Supprimer « ${item.name} » de ta garde-robe ?`)) return;
    const { error } = await supabase.from("wardrobe_items").delete().eq("id", item.id);
    if (error) {
      setMessage("Suppression impossible : " + error.message);
      return;
    }
    if (item.image_path) await supabase.storage.from("wardrobe").remove([item.image_path]);
    await loadItems();
  }

  // ---------- Affichage ----------
  if (!authChecked) {
    return <main className="mx-auto max-w-6xl px-4 py-12">Chargement…</main>;
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-3xl font-bold">My Digital Wardrobe</h1>
        <p className="mt-3">Ta garde-robe est privée : connecte-toi pour la voir et l'organiser.</p>
        <Link href="/login" className="mt-4 inline-block border px-5 py-2">
          Se connecter
        </Link>
      </main>
    );
  }

  const visibleItems = filter ? items.filter((i) => i.category === filter) : items;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold">My Digital Wardrobe</h1>
      <p className="mt-1 text-sm">Privée : toi seul(e) vois ces vêtements et ces photos.</p>

      {/* ----- Formulaire d'ajout ----- */}
      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 border p-4 md:grid-cols-2">
        <h2 className="text-xl font-semibold md:col-span-2">Ajouter un vêtement</h2>

        <div>
          <label htmlFor="name" className="block text-sm">Nom *</label>
          <input id="name" required value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Veste en jean" className={inputClass} />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm">Catégorie *</label>
          <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}
            className={inputClass}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="color" className="block text-sm">Couleur</label>
          <input id="color" value={color} onChange={(e) => setColor(e.target.value)}
            className={inputClass} />
        </div>

        <div>
          <label htmlFor="brand" className="block text-sm">Marque</label>
          <input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)}
            className={inputClass} />
        </div>

        <div>
          <label htmlFor="size" className="block text-sm">Taille</label>
          <input id="size" value={size} onChange={(e) => setSize(e.target.value)}
            className={inputClass} />
        </div>

        <div>
          <label htmlFor="warmth" className="block text-sm">Chaleur (1 = léger, 5 = très chaud)</label>
          <select id="warmth" value={warmth} onChange={(e) => setWarmth(e.target.value)}
            className={inputClass}>
            <option value="">Non précisé</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <fieldset className="md:col-span-2">
          <legend className="text-sm">Saisons</legend>
          <div className="mt-1 flex flex-wrap gap-4 text-sm">
            {SEASONS.map((s) => (
              <label key={s.value} className="flex items-center gap-2">
                <input type="checkbox" checked={seasons.includes(s.value)}
                  onChange={() => toggleSeason(s.value)} />
                {s.label}
              </label>
            ))}
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={waterproof}
                onChange={(e) => setWaterproof(e.target.checked)} />
                Imperméable
            </label>
          </div>
        </fieldset>

        <div className="md:col-span-2">
          <label htmlFor="photo" className="block text-sm">Photo (max {MAX_PHOTO_MB} Mo)</label>
          <input id="photo" key={fileInputKey} type="file" accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
        </div>

        <div className="md:col-span-2">
          <button type="submit" disabled={saving} className="border px-5 py-2">
            {saving ? "Ajout en cours…" : "Ajouter à ma garde-robe"}
          </button>
        </div>
      </form>

      {message && (
        <p role="status" className="mt-4 text-sm">{message}</p>
      )}

      {/* ----- Liste ----- */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Mes vêtements ({visibleItems.length})</h2>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          aria-label="Filtrer par catégorie" className="border bg-white px-3 py-2 text-sm text-black">
          <option value="">Toutes les catégories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {visibleItems.length === 0 ? (
        <p className="mt-6">
          {items.length === 0
            ? "Ta garde-robe est vide. Ajoute ton premier vêtement avec le formulaire ci-dessus."
            : "Aucun vêtement dans cette catégorie."}
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {visibleItems.map((item) => (
            <article key={item.id} className="border p-3">
              {item.image_path && imageUrls[item.image_path] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrls[item.image_path]} alt={item.name}
                  className="aspect-[3/4] w-full object-cover" />
              ) : (
                <div className="flex aspect-[3/4] w-full items-center justify-center bg-gray-200 text-sm text-gray-500">
                  Pas de photo
                </div>
              )}
              <h3 className="mt-2 font-semibold">{item.name}</h3>
              <p className="text-xs">
                {labelOf(CATEGORIES, item.category)}
                {item.color ? ` · ${item.color}` : ""}
                {item.size ? ` · ${item.size}` : ""}
              </p>
              {item.seasons.length > 0 && (
                <p className="text-xs">
                  {item.seasons.map((s) => labelOf(SEASONS, s)).join(", ")}
                </p>
              )}
              {item.waterproof && <p className="text-xs">Imperméable</p>}
              <button type="button" onClick={() => handleDelete(item)}
                className="mt-2 text-xs underline">
                Supprimer
              </button>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
