"use client";

// src/lib/favorites.ts
// Les favoris sont enregistrés dans la table "favorites" de Supabase (privés : chacun voit les siens).
// Tous les cœurs du site partagent la même liste, chargée une seule fois.

import { useEffect, useSyncExternalStore } from "react";
import { createClient } from "./supabase/client";

type FavState = { ids: Set<string>; loaded: boolean; userId: string | null };

const EMPTY: FavState = { ids: new Set(), loaded: false, userId: null };
let state: FavState = EMPTY;
let started = false;
const listeners = new Set<() => void>();

function setState(next: FavState) {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

const getSnapshot = () => state;
const getServerSnapshot = () => EMPTY;

// Relit les favoris de l'utilisateur connecté
async function refresh() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    setState({ ids: new Set(), loaded: true, userId: null });
    return;
  }
  const { data, error } = await supabase.from("favorites").select("product_id");
  const ids = error ? new Set<string>() : new Set((data ?? []).map((r: { product_id: string }) => r.product_id));
  setState({ ids, loaded: true, userId: user.id });
}

function start() {
  if (started) return;
  started = true;
  refresh();
  // Quand quelqu'un se connecte ou se déconnecte, on recharge (setTimeout : recommandé par Supabase)
  createClient().auth.onAuthStateChange((event) => {
    if (event === "INITIAL_SESSION") return;
    setTimeout(refresh, 0);
  });
}

// À utiliser dans un composant : { ids, loaded, userId }
export function useFavorites(): FavState {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    start();
  }, []);
  return snapshot;
}

type ToggleResult = { ok: true } | { ok: false; reason: "login" | "error"; message?: string };

// Ajoute ou retire un favori. L'affichage change tout de suite ; on annule si la base refuse.
export async function toggleFavorite(productId: string): Promise<ToggleResult> {
  if (!state.loaded) await refresh();
  const userId = state.userId;
  if (!userId) return { ok: false, reason: "login" };

  const supabase = createClient();
  const wasFavorite = state.ids.has(productId);
  const before = state.ids;
  const next = new Set(before);
  if (wasFavorite) next.delete(productId);
  else next.add(productId);
  setState({ ...state, ids: next });

  const { error } = wasFavorite
    ? await supabase.from("favorites").delete().eq("product_id", productId).eq("user_id", userId)
    : await supabase.from("favorites").insert({ product_id: productId });

  if (error) {
    setState({ ...state, ids: before });
    return { ok: false, reason: "error", message: error.message };
  }
  return { ok: true };
}