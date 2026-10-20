"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../../lib/supabase/client";

// ---------- Types ----------
type OutfitCard = {
  name: string;
  reason: string;
  items: { id: string; name: string; category: string; image_path: string | null }[];
};

type Suggestion = {
  id: string;
  title: string;
  brand: string;
  price: number;
  currency: string;
  category: string;
  reason: string;
};

type Meta = {
  wardrobeUsed: boolean;
  itemCount: number;
  weatherCity: string | null;
  eventsCount: number;
};

type ChatEntry = {
  role: "user" | "assistant";
  content: string;
  outfits?: OutfitCard[];
  suggestions?: Suggestion[];
  meta?: Meta;
};

const QUICK_PROMPTS = [
  "Que mettre demain pour l'université ?",
  "J'ai un mariage ce week-end, aide-moi à choisir une tenue.",
  "Je veux une tenue streetwear avec ce que j'ai déjà.",
  "Comment porter mes sneakers ?",
];

const CITY_KEY = "clothy_city";

export default function StylistPage() {
  const [supabase] = useState(() => createClient());

  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [consent, setConsent] = useState(false);
  const [city, setCity] = useState("");

  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [savedOutfits, setSavedOutfits] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  // Au chargement : qui est connecté ? a-t-il autorisé l'accès ? quelle ville ?
  const loadPrefs = useCallback(
    async (u: User) => {
      const { data } = await supabase
        .from("user_preferences")
        .select("stylist_wardrobe_consent")
        .eq("user_id", u.id)
        .maybeSingle();
      setConsent(!!data?.stylist_wardrobe_consent);
      try {
        setCity(window.localStorage.getItem(CITY_KEY) ?? "");
      } catch {
        // le stockage du navigateur peut être indisponible : ce n'est pas grave
      }
    },
    [supabase]
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthChecked(true);
      if (data.user) loadPrefs(data.user);
    });
  }, [supabase, loadPrefs]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function toggleConsent(value: boolean) {
    if (!user) return;
    setConsent(value);
    const { error: updateError } = await supabase
      .from("user_preferences")
      .update({ stylist_wardrobe_consent: value })
      .eq("user_id", user.id);
    if (updateError) {
      setConsent(!value);
      setError("Impossible d'enregistrer ton choix : " + updateError.message);
    }
  }

  function updateCity(value: string) {
    setCity(value);
    try {
      window.localStorage.setItem(CITY_KEY, value);
    } catch {
      // ignoré
    }
  }

  async function signPhotos(outfits: OutfitCard[]) {
    const paths = outfits.flatMap((o) => o.items.map((i) => i.image_path)).filter((p): p is string => !!p);
    if (paths.length === 0) return;
    const { data } = await supabase.storage.from("wardrobe").createSignedUrls(paths, 3600);
    const map: Record<string, string> = {};
    data?.forEach((s) => {
      if (s.path && s.signedUrl) map[s.path] = s.signedUrl;
    });
    setImageUrls((current) => ({ ...current, ...map }));
  }

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || loading) return;

    const history: ChatEntry[] = [...messages, { role: "user", content: clean }];
    setMessages(history);
    setInput("");
    setLoading(true);
    setError(null);
    setNotice(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setError("Session expirée : reconnecte-toi.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/stylist", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          city: city.trim() || undefined,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Une erreur est survenue.");
        setLoading(false);
        return;
      }

      const entry: ChatEntry = {
        role: "assistant",
        content: json.reply,
        outfits: json.outfits ?? [],
        suggestions: json.suggestions ?? [],
        meta: json.meta,
      };
      setMessages((m) => [...m, entry]);
      await signPhotos(entry.outfits ?? []);
    } catch {
      setError("Connexion impossible avec le serveur.");
    }
    setLoading(false);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  // Enregistre la tenue proposée dans "My Outfits"
  async function saveOutfit(outfit: OutfitCard, key: string) {
    setNotice(null);
    const { data: created, error: outfitError } = await supabase
      .from("outfits")
      .insert({ name: outfit.name })
      .select("id")
      .single();
    if (outfitError || !created) {
      setError("Enregistrement impossible : " + (outfitError?.message ?? "erreur inconnue"));
      return;
    }
    const rows = outfit.items.map((i) => ({ outfit_id: created.id, wardrobe_item_id: i.id }));
    const { error: itemsError } = await supabase.from("outfit_items").insert(rows);
    if (itemsError) {
      await supabase.from("outfits").delete().eq("id", created.id);
      setError("Enregistrement impossible : " + itemsError.message);
      return;
    }
    setSavedOutfits((s) => new Set(s).add(key));
    setNotice(`« ${outfit.name} » est enregistrée dans My Outfits.`);
  }

  // ---------- Affichage ----------
  if (!authChecked) {
    return <main className="mx-auto max-w-3xl px-4 py-12">Chargement…</main>;
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold">Clothy AI Stylist</h1>
        <p className="mt-3">Connecte-toi pour discuter avec ton styliste personnel.</p>
        <Link href="/login" className="mt-4 inline-block border px-5 py-2">Se connecter</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold">Clothy AI Stylist</h1>
      <p className="mt-1 text-sm">
        Je compose d&apos;abord des tenues avec les vêtements que tu possèdes déjà. Je ne propose un achat que si une pièce manque vraiment.
      </p>

      {/* Réglages : consentement et ville */}
      <section className="mt-6 space-y-3 border p-4 text-sm" aria-label="Réglages du styliste">
        <label className="flex items-start gap-2">
          <input type="checkbox" checked={consent} onChange={(e) => toggleConsent(e.target.checked)} className="mt-1" />
          <span>
            J&apos;autorise le styliste à lire ma garde-robe et mes événements des 7 prochains jours.
            <span className="block text-xs">
              Seuls des textes (nom, catégorie, couleur…) sont envoyés au service d&apos;IA (Google Gemini). Tes photos ne sont jamais envoyées.
              Avec l&apos;offre gratuite, Google peut utiliser ces textes pour améliorer ses modèles : n&apos;y mets rien de sensible.
            </span>
          </span>
        </label>
        <div>
          <label htmlFor="city" className="block">Ma ville (pour la météo réelle)</label>
          <input id="city" value={city} onChange={(e) => updateCity(e.target.value)}
            placeholder="Ex : Tétouan" className="w-full border bg-white px-3 py-2 text-black md:w-1/2" />
        </div>
        {!consent && (
          <p className="text-xs">Sans cette autorisation, je ne vois pas ta garde-robe et je ne peux donner que des conseils généraux.</p>
        )}
      </section>

      {/* Conversation */}
      <section className="mt-6 space-y-4" aria-label="Conversation" aria-live="polite">
        {messages.length === 0 && (
          <div>
            <p className="text-sm">Essaie par exemple :</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((p) => (
                <button key={p} type="button" onClick={() => send(p)} className="border px-3 py-2 text-left text-sm">
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, mi) =>
          m.role === "user" ? (
            <div key={mi} className="ml-auto max-w-[85%] border p-3 text-sm">
              {m.content}
            </div>
          ) : (
            <div key={mi} className="max-w-full space-y-3 border p-3 text-sm">
              <p className="whitespace-pre-wrap">{m.content}</p>

              {m.meta && (
                <p className="text-xs">
                  Données utilisées :{" "}
                  {[
                    m.meta.wardrobeUsed ? `ta garde-robe (${m.meta.itemCount} vêtements)` : null,
                    m.meta.eventsCount > 0 ? `${m.meta.eventsCount} événement(s)` : null,
                    m.meta.weatherCity ? `météo réelle de ${m.meta.weatherCity}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "aucune donnée personnelle (conseils généraux)"}
                  {!m.meta.weatherCity && " · météo non disponible"}
                </p>
              )}

              {m.outfits?.map((outfit, oi) => {
                const key = `${mi}-${oi}`;
                return (
                  <article key={key} className="border p-3">
                    <h3 className="font-semibold">{outfit.name}</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {outfit.items.map((item) => (
                        <div key={item.id} className="w-20 text-xs">
                          {item.image_path && imageUrls[item.image_path] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imageUrls[item.image_path]} alt={item.name} className="aspect-square w-full object-cover" />
                          ) : (
                            <div className="flex aspect-square w-full items-center justify-center bg-gray-200 text-gray-500">—</div>
                          )}
                          <span className="block truncate">{item.name}</span>
                        </div>
                      ))}
                    </div>
                    {outfit.reason && <p className="mt-2 text-xs">{outfit.reason}</p>}
                    <button type="button" disabled={savedOutfits.has(key)} onClick={() => saveOutfit(outfit, key)}
                      className="mt-2 text-xs underline">
                      {savedOutfits.has(key) ? "Enregistrée ✓" : "Enregistrer cette tenue"}
                    </button>
                  </article>
                );
              })}

              {m.suggestions && m.suggestions.length > 0 && (
                <div className="border p-3">
                  <h3 className="font-semibold">Pièce manquante (achat optionnel)</h3>
                  <p className="text-xs">Articles de démonstration du shop, pas de vrais stocks.</p>
                  <ul className="mt-2 space-y-2">
                    {m.suggestions.map((s) => (
                      <li key={s.id} className="text-xs">
                        <Link href={`/shop/${s.id}`} className="underline">
                          {s.title} · {s.brand} · {s.price} {s.currency}
                        </Link>
                        {s.reason && <span className="block">{s.reason}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        )}

        {loading && <p className="text-sm">Le styliste réfléchit…</p>}
        <div ref={bottomRef} />
      </section>

      {error && <p role="alert" className="mt-4 text-sm">Erreur : {error}</p>}
      {notice && <p role="status" className="mt-4 text-sm">{notice}</p>}

      {/* Saisie */}
      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={1000}
          placeholder="Pose ta question de style…" aria-label="Ton message"
          className="flex-1 border bg-white px-3 py-2 text-sm text-black" />
        <button type="submit" disabled={loading || !input.trim()} className="border px-5 py-2">
          Envoyer
        </button>
      </form>
    </main>
  );
}