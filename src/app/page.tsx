import ProductCard from "../components/ProductCard";
import { DEMO_PRODUCTS } from "../lib/demo-products";

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      {/* Bloc d'accueil (ton design) */}
      <section className="text-center py-12 bg-gray-50 rounded-2xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Bienvenue sur Clothy</h1>
        <p className="text-gray-600 max-w-xl mx-auto">
          Votre assistant personnel de garde-robe et styliste propulsé par l&apos;IA.
          Organisez vos tenues et créez votre style en toute simplicité.
        </p>
      </section>

      {/* Produits de démonstration : les 3 premiers de src/lib/demo-products.ts */}
      <section>
        <h2 className="mb-6 text-2xl font-bold text-white">Nouveautés populaires</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {DEMO_PRODUCTS.slice(0, 3).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}