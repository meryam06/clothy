import Link from "next/link";
import ProductCard from "../../components/ProductCard";
import { getProducts } from "../../lib/products";
import { SEASONS, STYLES } from "../../lib/styles";

export const dynamic = "force-dynamic"; // la liste doit toujours être à jour

type Props = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    type?: string;
    style?: string;
    season?: string;
    max?: string;
    sort?: string;
  }>;
};

export default async function ShopPage({ searchParams }: Props) {
  const { q = "", category = "", type = "", style = "", season = "", max = "", sort = "" } =
    await searchParams;
  const term = q.trim().toLowerCase();
  const maxPrice = Number(max.replace(",", "."));
  const hasMax = max.trim() !== "" && Number.isFinite(maxPrice) && maxPrice > 0;

  const products = await getProducts();
  const categories = Array.from(new Set(products.map((p) => p.category))).sort();

  // Recherche + filtres
  const results = products.filter((p) => {
    const text = [p.title, p.brand, p.category, p.color, ...p.styles].join(" ").toLowerCase();
    return (
      (!term || text.includes(term)) &&
      (!category || p.category === category) &&
      (!type || (type === "secondhand" ? p.isSecondHand : !p.isSecondHand)) &&
      (!style || p.styles.some((s) => s.toLowerCase() === style.toLowerCase())) &&
      (!season || p.seasons.includes(season)) &&
      (!hasMax || p.price <= maxPrice)
    );
  });

  // Tri (sans tri : les annonces les plus récentes d'abord, puis la démonstration)
  if (sort === "price_asc") results.sort((a, b) => a.price - b.price);
  if (sort === "price_desc") results.sort((a, b) => b.price - a.price);

  const hasFilters = Boolean(term || category || type || style || season || hasMax || sort);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold">Shop</h1>

      {/* Formulaire GET : l'adresse devient /shop?q=...&style=... et peut être partagée */}
      <form method="get" className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input name="q" defaultValue={q} placeholder="Rechercher…" aria-label="Rechercher" className="field" />

        <select name="category" defaultValue={category} aria-label="Catégorie" className="field">
          <option value="">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select name="style" defaultValue={style} aria-label="Style" className="field">
          <option value="">Tous les styles</option>
          {STYLES.map((s) => (
            <option key={s.name} value={s.name}>{s.name}</option>
          ))}
        </select>

        <select name="season" defaultValue={season} aria-label="Saison" className="field">
          <option value="">Toutes les saisons</option>
          {SEASONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <select name="type" defaultValue={type} aria-label="Neuf ou seconde main" className="field">
          <option value="">Neuf et seconde main</option>
          <option value="new">Neuf</option>
          <option value="secondhand">Seconde main</option>
        </select>

        <input name="max" defaultValue={max} inputMode="decimal" placeholder="Prix maximum"
          aria-label="Prix maximum" className="field" />

        <select name="sort" defaultValue={sort} aria-label="Trier" className="field">
          <option value="">Plus récents</option>
          <option value="price_asc">Prix croissant</option>
          <option value="price_desc">Prix décroissant</option>
        </select>

        <div className="flex gap-3">
          <button type="submit" className="btn btn-primary flex-1">Filtrer</button>
          {hasFilters && <Link href="/shop" className="btn">Réinitialiser</Link>}
        </div>
      </form>

      <p className="mt-6 text-sm text-muted">
        {results.length} résultat{results.length > 1 ? "s" : ""}
        {style ? ` · style ${style}` : ""}
        {season ? ` · ${SEASONS.find((s) => s.value === season)?.label ?? season}` : ""}
      </p>

      {results.length === 0 ? (
        <p className="mt-6">
          Aucun article ne correspond à ta recherche. Essaie d&apos;autres mots ou retire un filtre.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {results.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </main>
  );
}