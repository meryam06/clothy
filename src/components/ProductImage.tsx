"use client";

import { useState } from "react";
import Link from "next/link";

type Props = {
  src: string | null;
  alt: string;
  title: string;
  price: number;
  currency: string;
  href: string; // fiche de l'article
  hotspot?: { x: number; y: number }; // position (en %) du point sur la photo
};

// Photo d'un article. Un clic sur la photo affiche l'étiquette de prix sur l'article mis en avant ;
// un clic sur l'étiquette ouvre la fiche produit. Un deuxième clic sur la photo la referme.
export default function ProductImage({ src, alt, title, price, currency, href, hotspot }: Props) {
  const [open, setOpen] = useState(false);
  const pos = hotspot ?? { x: 50, y: 70 };

  // L'étiquette reste dans la photo : on limite sa position horizontale
  const tagLeft = Math.min(78, Math.max(22, pos.x));
  // Si le point est tout en haut, l'étiquette s'affiche en dessous
  const below = pos.y < 25;

  return (
    <div className="relative mb-4 aspect-[4/5] w-full overflow-hidden rounded-xl bg-line">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={`${open ? "Masquer" : "Afficher"} le prix : ${title}`}
        className="absolute inset-0 block h-full w-full cursor-pointer"
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-muted">Image produit</span>
        )}
      </button>

      {/* Point sur l'article mis en avant */}
      <span
        aria-hidden
        className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-deep shadow-md"
        style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
      />

      {/* Étiquette de prix */}
      {open && (
        <Link
          href={href}
          className="absolute whitespace-nowrap rounded-full bg-surface px-3 py-1.5 text-sm font-semibold text-surface-ink shadow-lg"
          style={{
            left: `${tagLeft}%`,
            top: `${pos.y}%`,
            transform: below ? "translate(-50%, 14px)" : "translate(-50%, calc(-100% - 14px))",
          }}
        >
          {price} {currency} · Voir →
        </Link>
      )}
    </div>
  );
}