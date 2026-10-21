"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../../lib/supabase/client";

// ---------- Types ----------
type OrderItemRow = {
  id: string;
  title: string | null;
  image_url: string | null;
  unit_price: number;
  quantity: number;
  seller_id: string | null;
};

type OrderRow = {
  id: string;
  buyer_id: string;
  status: string;
  total: number;
  created_at: string;
  shipping_address: { name?: string; phone?: string; address?: string; city?: string } | null;
  order_items: OrderItemRow[];
};

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  paid: "Payée (simulation)",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default function OrdersPage() {
  const [supabase] = useState(() => createClient());

  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [tab, setTab] = useState<"purchases" | "sales">("purchases");
  const [message, setMessage] = useState<string | null>(null);

  // La base ne renvoie que les commandes où je suis acheteur OU vendeur (règles RLS)
  const loadOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, buyer_id, status, total, created_at, shipping_address, order_items(id, title, image_url, unit_price, quantity, seller_id)"
      )
      .order("created_at", { ascending: false });
    if (error) {
      setMessage("Impossible de charger les commandes : " + error.message);
      return;
    }
    setOrders((data ?? []) as unknown as OrderRow[]);
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthChecked(true);
      if (data.user) loadOrders();
    });
  }, [supabase, loadOrders]);

  async function updateStatus(orderId: string, status: "shipped" | "delivered") {
    setMessage(null);
    const { error } = await supabase.rpc("update_order_status", {
      p_order: orderId,
      p_status: status,
    });
    if (error) {
      setMessage(error.message);
      return;
    }
    await loadOrders();
  }

  if (!authChecked) {
    return <main className="mx-auto max-w-4xl px-4 py-12">Chargement…</main>;
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-3xl font-bold">My Orders &amp; Sales</h1>
        <p className="mt-3">Connecte-toi pour voir tes commandes.</p>
        <Link href="/login" className="mt-4 inline-block border px-5 py-2">Se connecter</Link>
      </main>
    );
  }

  const purchases = orders.filter((o) => o.buyer_id === user.id);
  const sales = orders.filter((o) => o.order_items.some((i) => i.seller_id === user.id));
  const shown = tab === "purchases" ? purchases : sales;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold">My Orders &amp; Sales</h1>

      <div className="mt-4 flex gap-3">
        <button type="button" onClick={() => setTab("purchases")} aria-pressed={tab === "purchases"}
          className={`px-4 py-2 text-sm ${tab === "purchases" ? "border-4" : "border"}`}>
          Mes achats ({purchases.length})
        </button>
        <button type="button" onClick={() => setTab("sales")} aria-pressed={tab === "sales"}
          className={`px-4 py-2 text-sm ${tab === "sales" ? "border-4" : "border"}`}>
          Mes ventes ({sales.length})
        </button>
      </div>

      {message && <p role="alert" className="mt-4 text-sm">{message}</p>}

      {shown.length === 0 ? (
        <p className="mt-6">
          {tab === "purchases" ? (
            <>Aucun achat pour l&apos;instant. <Link href="/shop" className="underline">Découvre le shop</Link>.</>
          ) : (
            <>Aucune vente pour l&apos;instant. <Link href="/sell" className="underline">Publie une annonce</Link>.</>
          )}
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {shown.map((order) => {
            // Dans l'onglet "ventes", on ne montre que MES articles
            const lines =
              tab === "sales"
                ? order.order_items.filter((i) => i.seller_id === user.id)
                : order.order_items;
            const ship = order.shipping_address;

            return (
              <article key={order.id} className="border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <p>
                    Commande du {formatDate(order.created_at)} ·{" "}
                    <span className="font-semibold">{STATUS_LABEL[order.status] ?? order.status}</span>
                  </p>
                  <p className="font-semibold">Total : {order.total}</p>
                </div>

                <ul className="mt-3 space-y-2">
                  {lines.map((line) => (
                    <li key={line.id} className="flex items-center gap-3 text-sm">
                      {line.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={line.image_url} alt={line.title ?? "Article"} className="h-16 w-12 object-cover" />
                      ) : (
                        <div className="flex h-16 w-12 items-center justify-center bg-gray-200 text-xs text-gray-500">—</div>
                      )}
                      <span className="flex-1">{line.title ?? "Article"}</span>
                      <span>{line.unit_price}</span>
                    </li>
                  ))}
                </ul>

                {tab === "sales" && ship && (
                  <div className="mt-3 border-t pt-3 text-xs">
                    <p className="font-semibold">À expédier à :</p>
                    <p>{ship.name}{ship.phone ? ` · ${ship.phone}` : ""}</p>
                    <p>{ship.address}{ship.city ? `, ${ship.city}` : ""}</p>
                  </div>
                )}

                <div className="mt-3 text-sm">
                  {tab === "sales" && (order.status === "paid" || order.status === "pending") && (
                    <button type="button" onClick={() => updateStatus(order.id, "shipped")} className="border px-4 py-2">
                      Marquer comme expédiée
                    </button>
                  )}
                  {tab === "purchases" && order.status === "shipped" && (
                    <button type="button" onClick={() => updateStatus(order.id, "delivered")} className="border px-4 py-2">
                      J&apos;ai reçu ma commande
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}