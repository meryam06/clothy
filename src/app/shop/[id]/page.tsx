import Link from "next/link";
import { notFound } from "next/navigation";
import { CONDITION_LABEL, DEMO_PRODUCTS } from "../../../lib/demo-products";

type Props = { params: Promise<{ id: string }> };

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = DEMO_PRODUCTS.find((p) => p.id === id);
  if (!product) notFound();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/shop" className="text-sm underline">← Retour au shop</Link>

      <div className="mt-6 grid gap-8 md:grid-cols-2">
        {/* TOI : galerie de photos du produit */}
        <div className="aspect-[3/4] w-full bg-gray-200" />

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide">{product.brand}</p>
          <h1 className="text-3xl font-bold">{product.title}</h1>
          <p className="text-2xl font-semibold">
            {product.price} {product.currency}
          </p>
          <p>{product.description}</p>
          <ul className="text-sm space-y-1">
            <li>Taille : {product.size}</li>
            <li>Couleur : {product.color}</li>
            <li>État : {CONDITION_LABEL[product.condition]}</li>
            <li>Catégorie : {product.category}</li>
            <li>Styles : {product.styles.join(", ")}</li>
            <li>Vendeur : {product.seller}</li>
          </ul>
          <p className="text-xs">
            Données de démonstration. Les infos des annonces de particuliers sont fournies par les vendeurs.
          </p>
          <button type="button" className="border px-5 py-2" disabled>
            Ajouter au panier (bientôt)
          </button>
        </div>
      </div>
    </main>
  );
}
