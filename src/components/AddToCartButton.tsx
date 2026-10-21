"use client";

import Link from "next/link";
import { addToCart, useCart, type CartItem } from "../lib/cart";

export default function AddToCartButton({ item }: { item: CartItem }) {
  const items = useCart();
  const inCart = items.some((i) => i.id === item.id);

  if (inCart) {
    return (
      <div className="space-y-2">
        <p className="text-sm">Cet article est dans ton panier.</p>
        <Link href="/cart" className="inline-block border px-5 py-2">
          Voir mon panier
        </Link>
      </div>
    );
  }

  return (
    <button type="button" className="border px-5 py-2" onClick={() => addToCart(item)}>
      Ajouter au panier
    </button>
  );
}