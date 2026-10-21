import ProductCard from "../../components/ProductCard";
import { getProducts } from "../../lib/products";

export const dynamic = "force-dynamic"; // la liste doit toujours être à jour

type Props = {
  searchParams: Promise<{ q?: string; category?: string; type?: string }>;
};

export default async function ShopPage({ searchParams }: Props) {
  const { q = "", category = "", type = "" } = await searchParams;
  const term = q.trim().toLowerCase();

  const products = await getProducts();
  const categories = Array.from(new Set(products.map((p) => p.category))).sort();

  // Recherche + catégorie + neuf / seconde main
  const results = products.filter((p) => {
    const text = [p.title, p.brand, p.category, p.color, ...p.styles].join(" ").toLowerCase();
    const matchesText = !term || text.includes(term);
    const matchesCategory = !category || p.category === category;
    const matchesType = !type || (type === "secondhand" ? p.isSecondHand : !p.isSecondHand);
    return matchesText && matchesCategory && matchesType;
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Shop</h1>

      {/* Formulaire GET : l'adresse devient /shop?q=...&category=... */}
      <form method="get" className="mb-8 flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Rechercher…"
          className="border bg-white px-3 py-2 text-sm text-black"
        />
        <select name="category" defaultValue={category} className="border bg-white px-3 py-2 text-sm text-black">
          <option value="">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select name="type" defaultValue={type} className="border bg-white px-3 py-2 text-sm text-black">
          <option value="">Neuf et seconde main</option>
          <option value="new">Neuf</option>
          <option value="secondhand">Seconde main</option>
        </select>
        <button type="submit" className="border px-4 py-2 text-sm">Filtrer</button>
      </form>

      <p className="mb-4 text-sm">{results.length} résultat(s)</p>

      {results.length === 0 ? (
        <p>Aucun produit ne correspond à ta recherche. Essaie d&apos;autres mots ou retire un filtre.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {results.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </main>
  );
}