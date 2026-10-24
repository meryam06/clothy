import Link from "next/link";
import FavoriteButton from "./FavoriteButton";
import { CONDITION_LABEL } from "../lib/demo-products";
import type { ShopProduct } from "../lib/products";

export default function ProductCard({ product }: { product: ShopProduct }) {
  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <div>
        {/* TOI : tu peux changer la forme et la taille de l'image */}
        {product.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.images[0]}
            alt={product.title}
            className="mb-4 h-64 w-full rounded-xl object-cover"
          />
        ) : (
          <div className="mb-4 flex h-64 items-center justify-center rounded-xl bg-line text-muted">
            Image produit
          </div>
        )}

        <div className="mb-2 flex flex-wrap gap-1">
          {product.isDemo && <span className="badge">Démo</span>}
          {product.isSecondHand && <span className="badge">Seconde main</span>}
          {product.verifiedBrand && <span className="badge">Marque vérifiée</span>}
        </div>

        <h3 className="text-lg font-semibold">{product.title}</h3>
        <p className="mt-1 text-sm text-muted">
          {product.brand} · {product.category}
        </p>
        <p className="mt-1 text-xs text-muted">
          {CONDITION_LABEL[product.condition]} · Taille {product.size}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="font-semibold">
          {product.price} {product.currency}
        </span>
        <Link href={`/shop/${product.id}`} className="btn btn-primary">
          Voir
        </Link>
      </div>

      {!product.isDemo && <FavoriteButton productId={product.id} />}
    </div>
  );
}