import Link from "next/link";
import FavoriteButton from "./FavoriteButton";
import { CONDITION_LABEL, type Product } from "../lib/demo-products";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <div className="relative flex flex-col justify-between rounded-lg border bg-white p-4 shadow-sm">
      <div>
        {/* TOI : remplace ce bloc par ta vraie photo (balise <img>) */}
        <div className="mb-4 flex h-48 items-center justify-center rounded-md bg-gray-100 text-gray-400">
          Image produit
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
