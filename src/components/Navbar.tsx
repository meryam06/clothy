"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../lib/supabase/client";


const LINKS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/styles", label: "Discover Styles" },
  { href: "/wardrobe", label: "My Wardrobe" },
  { href: "/outfits", label: "My Outfits" },
  { href: "/planner", label: "Outfit Planner" },
  { href: "/stylist", label: "AI Stylist" },
  { href: "/sell", label: "Sell" },
];

export default function Navbar() {
  const router = useRouter();
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

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 p-4">
        <Link href="/" className="text-2xl font-bold">
          Clothy
        </Link>

        <form onSubmit={handleSearch} className="flex-1 min-w-[160px]">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un vêtement, une marque, un style…"
            aria-label="Rechercher"
            className="w-full border px-3 py-2 text-sm"
          />
        </form>

        <div className="flex items-center gap-4 text-sm">
          <Link href="/wishlist" aria-label="Wishlist">♡ Wishlist</Link>
          <Link href="/cart" aria-label="Panier">Panier</Link>
          {user ? (
            <button type="button" onClick={handleLogout}>
              Déconnexion
            </button>
          ) : (
            <Link href="/login">Connexion</Link>
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
        className={`${menuOpen ? "flex" : "hidden"} mx-auto max-w-6xl flex-col gap-2 px-4 pb-4 text-sm md:flex md:flex-row md:gap-6`}
      >
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
