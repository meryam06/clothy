"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Bouton flottant visible sur tout le site (sauf sur la page du styliste elle-même)
export default function FloatingStylistButton() {
  const pathname = usePathname();
  if (pathname === "/stylist") return null;

  return (
    <Link
      href="/stylist"
      aria-label="Ouvrir le styliste IA"
      className="fixed bottom-6 right-6 z-50 border bg-white px-4 py-3 text-sm font-semibold text-black shadow-lg"
    >
      AI Stylist
    </Link>
  );
}