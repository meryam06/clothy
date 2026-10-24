import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCartButton from "../../../components/AddToCartButton";
import { CONDITION_LABEL } from "../../../lib/demo-products";
import { getProductById } from "../../../lib/products";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  const [mainImage, ...otherImages] = product.images;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/shop" className="text-sm underline">← Retour au shop</Link>

      <div className="mt-6 grid gap-8 md:grid-cols-2">
        {/* Photos */}
        <div>
          {mainImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mainImage} alt={product.title} className="aspect-3/4 w-full object-cover" />
          ) : (
            <div className="flex aspect-3/4 w-full items-center justify-center bg-line text-muted">
              Pas de photo
            </div>
          )}
          {otherImages.length > 0 && (
            <div className="mt-2 grid grid-cols-4 gap-2">
              {otherImages.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={url} src={url} alt={`${product.title} (autre vue)`} className="aspect-square w-full object-cover" />
              ))}
            </div>
          )}
        </div>

        {/* Informations */}
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide">{product.brand}</p>
          <h1 className="text-3xl font-bold">{product.title}</h1>
          <p className="text-2xl font-semibold">
            {product.price} {product.currency}
          </p>
          <p className="whitespace-pre-wrap">{product.description}</p>

          <ul className="space-y-1 text-sm">
            <li>Taille : {product.size}</li>
            <li>Couleur : {product.color}</li>
            <li>État : {CONDITION_LABEL[product.condition]}</li>
            <li>Catégorie : {product.category}</li>
            {product.styles.length > 0 && <li>Styles : {product.styles.join(", ")}</li>}
            <li>Vendeur : {product.seller}</li>
          </ul>

          {/* Distinction entre informations vérifiées et informations du vendeur */}
          <p className="rounded-xl border border-line bg-surface p-3 text-xs">
            {product.isDemo
              ? "Produit de démonstration : ce n'est pas un vrai article en vente."
              : product.verifiedBrand
                ? "La marque de cet article a été vérifiée par Clothy. Les autres informations sont fournies par le vendeur."
                : "Les informations de cette annonce (marque, état, taille) sont fournies par le vendeur et n'ont pas été vérifiées par Clothy."}
          </p>

          {product.isDemo ? (
            <button type="button" className="btn" disabled>
              Produit de démonstration : achat impossible
            </button>
          ) : (
            <AddToCartButton
              item={{
                id: product.id,
                title: product.title,
                price: product.price,
                currency: product.currency,
                image: product.images[0] ?? null,
                seller: product.seller,
              }}
            />
          )}
        </div>
      </div>
    </main>
  );
}