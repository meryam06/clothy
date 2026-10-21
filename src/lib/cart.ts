"use client";

// src/lib/cart.ts
// Panier stocké dans le navigateur (localStorage). Pas de table nécessaire :
// la vraie commande n'est créée qu'au moment de "Passer la commande".

import { useSyncExternalStore } from "react";

export type CartItem = {
  id: string; // identifiant de l'annonce (uuid)
  title: string;
  price: number;
  currency: string;
  image: string | null;
  seller: string;
};

const KEY = "clothy_cart";
const EVENT = "clothy-cart-change";
const EMPTY: CartItem[] = [];

// Petit cache : React exige que la même valeur soit renvoyée tant que rien ne change
let cache: { raw: string | null; items: CartItem[] } = { raw: null, items: EMPTY };

function read(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw !== cache.raw) {
      const parsed = raw ? JSON.parse(raw) : [];
      cache = { raw, items: Array.isArray(parsed) ? (parsed as CartItem[]) : EMPTY };
    }
  } catch {
    cache = { raw: null, items: EMPTY };
  }
  return cache.items;
}

function write(items: CartItem[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // stockage indisponible (navigation privée très stricte) : on ignore
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}

// À utiliser dans un composant : renvoie la liste des articles du panier
export function useCart(): CartItem[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function addToCart(item: CartItem) {
  const items = read();
  if (items.some((i) => i.id === item.id)) return; // chaque article existe en un seul exemplaire
  write([...items, item]);
}

export function removeFromCart(id: string) {
  write(read().filter((i) => i.id !== id));
}

export function clearCart() {
  write([]);
}