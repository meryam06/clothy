import Link from "next/link";
import FavoriteButton from "./FavoriteButton";
import { CONDITION_LABEL } from "../lib/demo-products";
import type { ShopProduct } from "../lib/products";

export default function ProductCard({ product }: { product: ShopProduct }) {
  return (
    <div className="relative flex flex-col justify-between rounded-lg border bg-white p-4 shadow-sm">
      <div>
        {/* TOI : tu peux changer la forme et la taille de l'image */}
        {product.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.images[0]}
            alt={product.title}
            className="mb-4 h-64 w-full rounded-md object-cover"
          />
        ) : (
          <div className="mb-4 flex h-64 items-center justify-center rounded-md bg-gray-100 text-gray-400">
            Image produit
          </div>
        )}

        <div className="mb-1 flex flex-wrap gap-1 text-xs text-gray-700">
          {product.isDemo && <span className="border px-1.5 py-0.5">Démo</span>}
          {product.isSecondHand && <span className="border px-1.5 py-0.5">Seconde main</span>}
          {product.verifiedBrand && <span className="border px-1.5 py-0.5">Marque vérifiée</span>}
        </div>

        <h3 className="text-lg font-semibold text-gray-800">{product.title}</h3>
        <p className="mt-1 text-sm text-gray-500">
          {product.brand} · {product.category}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {CONDITION_LABEL[product.condition]} · Taille {product.size}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="font-bold text-black">
          {product.price} {product.currency}
        </span>
        <Link
          href={`/shop/${product.id}`}
          className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
        >
          Voir
        </Link>
      </div>

      <FavoriteButton />
    </div>
  );
}