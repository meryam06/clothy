import Link from "next/link";
import FavoriteButton from "./FavoriteButton";
import ProductImage from "./ProductImage";
import { CONDITION_LABEL } from "../lib/demo-products";
import type { ShopProduct } from "../lib/products";

export default function ProductCard({ product }: { product: ShopProduct }) {
  const href = `/shop/${product.id}`;

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <div>
        {/* Clique sur la photo : le prix s'affiche sur l'article mis en avant */}
        <ProductImage
          src={product.images[0] ?? null}
          alt={product.title}
          title={product.title}
          price={product.price}
          currency={product.currency}
          href={href}
          hotspot={product.hotspot}
        />

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
        <Link href={href} className="btn btn-primary">
          Voir
        </Link>
      </div>

      {!product.isDemo && <FavoriteButton productId={product.id} />}
    </div>
  );
}