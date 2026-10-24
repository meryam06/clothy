"use client";

import { useCart } from "../lib/cart";
import Link from "next/link";
import { useEffect, useState, type FormEvent, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../lib/supabase/client";

// Liens principaux (toujours visibles)
const MAIN_LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/styles", label: "Discover Styles" },
  { href: "/wardrobe", label: "My Wardrobe" },
  { href: "/stylist", label: "AI Stylist" },
  { href: "/sell", label: "Sell" },
];

// Liens rangés dans le menu « Mon espace »
const SPACE_LINKS = [
  { href: "/outfits", label: "My Outfits" },
  { href: "/planner", label: "Outfit Planner" },
  { href: "/orders", label: "My Orders" },
];

export default function Navbar() {
  const router = useRouter();
  const cart = useCart();
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Savoir si quelqu'un est connecté, et se mettre à jour quand ça change
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    router.push(`/shop?q=${encodeURIComponent(query.trim())}`);
    setMenuOpen(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  // Referme le menu mobile et le menu « Mon espace » après un clic sur un lien
  function closeMenus(e: MouseEvent<HTMLElement>) {
    e.currentTarget.closest("details")?.removeAttribute("open");
    setMenuOpen(false);
  }

  // TOI : les classes ci-dessous (section-deep, font-display, tracking-wide…) sont à modifier à ton goût
  const linkClass = "tracking-wide underline-offset-8 hover:underline";

  return (
    <header className="section-deep sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-4">
        <Link href="/" className="font-display text-3xl tracking-wide">
          Clothy
        </Link>

        <form onSubmit={handleSearch} className="min-w-40 flex-1">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un vêtement, une marque, un style…"
            aria-label="Rechercher"
            className="w-full border border-control bg-transparent px-3 py-2 text-sm placeholder:text-muted"
          />
        </form>

        <div className="flex items-center gap-5 text-sm">
          <Link href="/wishlist" aria-label="Wishlist" className={linkClass}>♡ Wishlist</Link>
          <Link href="/cart" aria-label="Panier" className={linkClass}>
            Panier{cart.length > 0 ? ` (${cart.length})` : ""}
          </Link>
          {user ? (
            <button type="button" onClick={handleLogout} className={linkClass}>
              Déconnexion
            </button>
          ) : (
            <Link href="/login" className={linkClass}>Connexion</Link>
          )}
          <button
            type="button"
            className="md:hidden"
            aria-label="Ouvrir le menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ☰
          </button>
        </div>
      </div>

      <nav
        aria-label="Navigation principale"
        className={`${menuOpen ? "flex" : "hidden"} mx-auto max-w-6xl flex-col gap-3 px-4 pb-4 text-sm md:flex md:flex-row md:items-center md:gap-8`}
      >
        {MAIN_LINKS.map((link) => (
          <Link key={link.href} href={link.href} onClick={closeMenus} className={linkClass}>
            {link.label}
          </Link>
        ))}

        {/* Menu « Mon espace » : un simple bloc <details>, sans code supplémentaire */}
        <details className="relative">
          <summary className={`cursor-pointer list-none ${linkClass}`}>Mon espace ▾</summary>
          <ul className="mt-2 flex flex-col gap-2 pl-3 md:absolute md:left-0 md:top-full md:z-50 md:min-w-48 md:border md:border-line md:bg-deep md:p-4 md:pl-4">
            {SPACE_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} onClick={closeMenus} className={linkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      </nav>
    </header>
  );
}