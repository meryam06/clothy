"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../../lib/supabase/client";

// ---------- Listes de choix ----------
const CONDITIONS = [
  { value: "new", label: "Neuf" },
  { value: "like_new", label: "Comme neuf" },
  { value: "good", label: "Bon état" },
  { value: "fair", label: "État correct" },
];

const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  active: "En ligne",
  paused: "En pause",
  sold: "Vendu",
};

const MAX_PHOTOS = 5;
const MAX_PHOTO_MB = 5;
const PUBLIC_MARK = "/object/public/products/"; // sert à retrouver le chemin d'une photo

// ---------- Types ----------
type Category = { id: number; name: string };

type Listing = {
  id: string;
  title: string;
  price: number;
  currency: string;
  status: string;
  condition: string;
  size: string | null;
  brand_name: string | null;
  product_images: { url: string; position: number }[];
};

const inputClass = "w-full border bg-white px-3 py-2 text-sm text-black";

function conditionLabel(value: string) {
  return CONDITIONS.find((c) => c.value === value)?.label ?? value;
}

export default function SellPage() {
  const [supabase] = useState(() => createClient());

  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);

  // Formulaire
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandName, setBrandName] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [condition, setCondition] = useState("good");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("MAD");
  const [publishNow, setPublishNow] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Charge les catégories et MES annonces
  const loadAll = useCallback(
    async (u: User) => {
      const [catRes, listRes] = await Promise.all([
        supabase.from("categories").select("id, name").order("name"),
        supabase
          .from("products")
          .select("id, title, price, currency, status, condition, size, brand_name, product_images(url, position)")
          .eq("seller_id", u.id)
          .order("created_at", { ascending: false }),
      ]);
      if (catRes.error || listRes.error) {
        setMessage("Impossible de charger les données : " + (catRes.error?.message ?? listRes.error?.message));
        return;
      }
      setCategories((catRes.data ?? []) as unknown as Category[]);
      setListings((listRes.data ?? []) as unknown as Listing[]);
    },
    [supabase]
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthChecked(true);
      if (data.user) loadAll(data.user);
    });
  }, [supabase, loadAll]);

  function handleFiles(list: FileList | null) {
    setFiles(list ? Array.from(list) : []);
  }

  // Publier : 1) créer l'annonce  2) envoyer les photos  3) relier les photos à l'annonce
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setMessage(null);

    const priceNumber = Number(price.replace(",", "."));
    if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
      setMessage("Indique un prix valide (supérieur à 0).");
      return;
    }
    if (files.length === 0) {
      setMessage("Ajoute au moins une photo.");
      return;
    }
    if (files.length > MAX_PHOTOS) {
      setMessage(`Tu peux ajouter ${MAX_PHOTOS} photos au maximum.`);
      return;
    }
    for (const f of files) {
      if (!f.type.startsWith("image/")) {
        setMessage(`« ${f.name} » n'est pas une image.`);
        return;
      }
      if (f.size > MAX_PHOTO_MB * 1024 * 1024) {
        setMessage(`« ${f.name} » dépasse ${MAX_PHOTO_MB} Mo.`);
        return;
      }
    }

    setSaving(true);

    const { data: product, error: productError } = await supabase
      .from("products")
      .insert({
        seller_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        category_id: categoryId ? Number(categoryId) : null,
        brand_name: brandName.trim() || null,
        size: size.trim() || null,
        color: color.trim() || null,
        condition,
        price: priceNumber,
        currency: currency.trim().toUpperCase() || "MAD",
        stock: 1,
        status: publishNow ? "active" : "draft",
      })
      .select("id")
      .single();

    if (productError || !product) {
      setMessage("Création de l'annonce impossible : " + (productError?.message ?? "erreur inconnue"));
      setSaving(false);
      return;
    }

    // Envoi des photos (dossier public "products", rangées sous TON identifiant)
    const uploadedPaths: string[] = [];
    const imageRows: { product_id: string; url: string; position: number }[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = f.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${product.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("products").upload(path, f);
      if (uploadError) {
        // on nettoie tout ce qui a été créé
        if (uploadedPaths.length) await supabase.storage.from("products").remove(uploadedPaths);
        await supabase.from("products").delete().eq("id", product.id);
        setMessage("Envoi d'une photo impossible : " + uploadError.message);
        setSaving(false);
        return;
      }
      uploadedPaths.push(path);
      const { data: pub } = supabase.storage.from("products").getPublicUrl(path);
      imageRows.push({ product_id: product.id, url: pub.publicUrl, position: i });
    }

    const { error: imagesError } = await supabase.from("product_images").insert(imageRows);
    if (imagesError) {
      await supabase.storage.from("products").remove(uploadedPaths);
      await supabase.from("products").delete().eq("id", product.id);
      setMessage("Enregistrement des photos impossible : " + imagesError.message);
      setSaving(false);
      return;
    }

    setTitle("");
    setDescription("");
    setCategoryId("");
    setBrandName("");
    setSize("");
    setColor("");
    setCondition("good");
    setPrice("");
    setFiles([]);
    setFileInputKey((k) => k + 1);
    setMessage(publishNow ? "Annonce publiée." : "Annonce enregistrée en brouillon.");
    await loadAll(user);
    setSaving(false);
  }

  async function changeStatus(listing: Listing, status: string) {
    const { error } = await supabase.from("products").update({ status }).eq("id", listing.id);
    if (error) {
      setMessage("Modification impossible : " + error.message);
      return;
    }
    setListings((list) => list.map((l) => (l.id === listing.id ? { ...l, status } : l)));
  }

  async function deleteListing(listing: Listing) {
    if (!window.confirm(`Supprimer l'annonce « ${listing.title} » ?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", listing.id);
    if (error) {
      setMessage("Suppression impossible : " + error.message);
      return;
    }
    // On supprime aussi les fichiers des photos (si l'étape échoue, ce n'est pas bloquant)
    const paths = listing.product_images
      .map((img) => img.url.split(PUBLIC_MARK)[1])
      .filter((p): p is string => !!p);
    if (paths.length) await supabase.storage.from("products").remove(paths);
    setListings((list) => list.filter((l) => l.id !== listing.id));
  }

  // ---------- Affichage ----------
  if (!authChecked) {
    return <main className="mx-auto max-w-6xl px-4 py-12">Chargement…</main>;
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-3xl font-bold">Sell on Clothy</h1>
        <p className="mt-3">Connecte-toi pour publier et gérer tes annonces.</p>
        <Link href="/login" className="mt-4 inline-block border px-5 py-2">Se connecter</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold">Sell on Clothy</h1>
      <p className="mt-1 text-sm">Publie un vêtement ou un accessoire, neuf ou d&apos;occasion.</p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 border p-4 md:grid-cols-2">
        <h2 className="text-xl font-semibold md:col-span-2">Nouvelle annonce</h2>

        <div className="md:col-span-2">
          <label htmlFor="title" className="block text-sm">Titre *</label>
          <input id="title" required minLength={3} maxLength={140} value={title}
            onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Veste en cuir marron, taille M"
            className={inputClass} />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="description" className="block text-sm">Description</label>
          <textarea id="description" rows={4} value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="État réel, défauts éventuels, matière, mesures…" className={inputClass} />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm">Catégorie *</label>
          <select id="category" required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
            className={inputClass}>
            <option value="">Choisir…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="brand" className="block text-sm">Marque</label>
          <input id="brand" value={brandName} onChange={(e) => setBrandName(e.target.value)}
            className={inputClass} />
        </div>

        <div>
          <label htmlFor="size" className="block text-sm">Taille</label>
          <input id="size" value={size} onChange={(e) => setSize(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label htmlFor="color" className="block text-sm">Couleur</label>
          <input id="color" value={color} onChange={(e) => setColor(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label htmlFor="condition" className="block text-sm">État *</label>
          <select id="condition" value={condition} onChange={(e) => setCondition(e.target.value)}
            className={inputClass}>
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="price" className="block text-sm">Prix *</label>
            <input id="price" required inputMode="decimal" value={price}
              onChange={(e) => setPrice(e.target.value)} placeholder="250" className={inputClass} />
          </div>
          <div>
            <label htmlFor="currency" className="block text-sm">Devise</label>
            <input id="currency" maxLength={3} value={currency}
              onChange={(e) => setCurrency(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="photos" className="block text-sm">
            Photos * (1 à {MAX_PHOTOS}, {MAX_PHOTO_MB} Mo maximum chacune)
          </label>
          <input id="photos" key={fileInputKey} type="file" accept="image/*" multiple
            onChange={(e) => handleFiles(e.target.files)} className="text-sm" />
          {files.length > 0 && <p className="mt-1 text-xs">{files.length} photo(s) sélectionnée(s)</p>}
        </div>

        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} />
          Publier tout de suite (sinon l&apos;annonce reste en brouillon)
        </label>

        <p className="text-xs md:col-span-2">
          Les informations de l&apos;annonce (marque, état, taille) sont fournies par toi, le vendeur : Clothy ne les a pas vérifiées.
          Décris honnêtement l&apos;article et ses défauts.
        </p>

        <div className="md:col-span-2">
          <button type="submit" disabled={saving} className="border px-5 py-2">
            {saving ? "Publication en cours…" : "Enregistrer l'annonce"}
          </button>
        </div>
      </form>

      {message && <p role="status" className="mt-4 text-sm">{message}</p>}

      {/* ----- Mes annonces ----- */}
      <h2 className="mt-10 text-xl font-semibold">Mes annonces ({listings.length})</h2>

      {listings.length === 0 ? (
        <p className="mt-4">Tu n&apos;as pas encore d&apos;annonce.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          {listings.map((l) => {
            const cover = [...l.product_images].sort((a, b) => a.position - b.position)[0];
            return (
              <article key={l.id} className="border p-3">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover.url} alt={l.title} className="aspect-[3/4] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[3/4] w-full items-center justify-center bg-gray-200 text-sm text-gray-500">
                    Pas de photo
                  </div>
                )}
                <h3 className="mt-2 text-sm font-semibold">{l.title}</h3>
                <p className="text-sm">{l.price} {l.currency}</p>
                <p className="text-xs">
                  {STATUS_LABEL[l.status] ?? l.status} · {conditionLabel(l.condition)}
                  {l.size ? ` · ${l.size}` : ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                  {l.status === "active" && (
                    <button type="button" className="underline" onClick={() => changeStatus(l, "paused")}>Mettre en pause</button>
                  )}
                  {(l.status === "paused" || l.status === "draft") && (
                    <button type="button" className="underline" onClick={() => changeStatus(l, "active")}>Mettre en ligne</button>
                  )}
                  {l.status !== "sold" && (
                    <button type="button" className="underline" onClick={() => changeStatus(l, "sold")}>Marquer vendu</button>
                  )}
                  <button type="button" className="underline" onClick={() => deleteListing(l)}>Supprimer</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}