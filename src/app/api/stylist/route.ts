// src/app/api/stylist/route.ts
// Route SERVEUR : la clé de l'IA reste ici et n'est jamais envoyée au navigateur.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { DEMO_PRODUCTS } from "../../../lib/demo-products";

type ChatMessage = { role: "user" | "assistant"; content: string };

type WardrobeRow = {
  id: string;
  name: string;
  category: string;
  color: string | null;
  brand: string | null;
  size: string | null;
  seasons: string[] | null;
  styles: string[] | null;
  waterproof: boolean;
  warmth_level: number | null;
  image_path: string | null;
};

// Catégories de la garde-robe -> catégories des produits de démonstration
const DEMO_MATCH: Record<string, string[]> = {
  tops: ["Shirts", "Knitwear"],
  bottoms: ["Jeans"],
  dresses: ["Dresses"],
  jackets: ["Coats"],
  shoes: ["Sneakers"],
  bags: ["Bags"],
  accessories: ["Scarves"],
};

function weatherDescription(code: number): string {
  if (code === 0) return "ciel dégagé";
  if (code >= 1 && code <= 3) return "peu à très nuageux";
  if (code === 45 || code === 48) return "brouillard";
  if (code >= 51 && code <= 57) return "bruine";
  if (code >= 61 && code <= 67) return "pluie";
  if (code >= 71 && code <= 77) return "neige";
  if (code >= 80 && code <= 82) return "averses";
  if (code === 85 || code === 86) return "averses de neige";
  if (code >= 95) return "orage";
  return "conditions variables";
}

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("fr-FR", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// Trouve les coordonnées d'une ville (Open-Meteo, gratuit, sans clé)
async function geocodeCity(city: string) {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=fr&format=json`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    const r = json.results?.[0];
    if (!r) return null;
    return {
      lat: r.latitude as number,
      lon: r.longitude as number,
      label: [r.name, r.country].filter(Boolean).join(", "),
    };
  } catch {
    return null;
  }
}

// Prévisions réelles des 7 prochains jours
async function forecastLines(lat: number, lon: number): Promise<string[]> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max` +
      `&timezone=auto&forecast_days=7`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const j = await res.json();
    const d = j.daily;
    if (!d?.time) return [];
    return (d.time as string[]).map((day, i) => {
      const weekday = new Date(day + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long" });
      const rain = d.precipitation_probability_max?.[i];
      return (
        `${day} (${weekday}) : ${weatherDescription(d.weather_code[i])}, ` +
        `${Math.round(d.temperature_2m_min[i])}° à ${Math.round(d.temperature_2m_max[i])}°C, ` +
        `pluie ${rain ?? "?"} %, vent max ${Math.round(d.wind_speed_10m_max[i])} km/h`
      );
    });
  } catch {
    return [];
  }
}

const SYSTEM_RULES = `Tu es Clothy AI Stylist, un styliste amical, précis et honnête.

RÈGLES (obligatoires) :
1. Compose d'abord des tenues UNIQUEMENT avec les vêtements de la section GARDE-ROBE, en citant leurs codes (v1, v2…). N'invente jamais de vêtement, de marque, de prix ni de stock.
2. N'indique des pièces manquantes (missing_pieces) que si une bonne tenue est impossible avec la garde-robe (par exemple aucune veste imperméable alors qu'il pleut). Ne propose jamais d'acheter par défaut.
3. Utilise la météo UNIQUEMENT si elle figure dans PRÉVISIONS MÉTÉO. Sinon, dis clairement que tu n'as pas la météo (et propose à l'utilisateur d'indiquer sa ville), ou raisonne par hypothèse en le précisant.
4. Si l'accès à la garde-robe n'est pas autorisé ou si la garde-robe est vide, ne prétends pas connaître ses vêtements : donne des conseils généraux et invite à activer l'accès ou à ajouter des vêtements.
5. Distingue toujours ce qui vient des données (garde-robe, météo, événements) de tes hypothèses.
6. Explique en une ou deux phrases pourquoi chaque tenue convient (occasion, météo, couleurs, matières).
7. Si l'utilisateur n'aime pas une proposition, propose une alternative différente.
8. Réponds dans la langue de l'utilisateur. Ton chaleureux et concis.

FORMAT : réponds UNIQUEMENT avec un objet JSON de cette forme :
{"reply": string, "outfits": [{"name": string, "item_codes": [string], "reason": string}], "missing_pieces": [{"category": "tops|bottoms|dresses|jackets|shoes|bags|accessories", "reason": string}]}
- "reply" est le texte affiché à l'utilisateur (court, sans lister tous les codes).
- 0 à 3 tenues ; chaque tenue a 2 à 6 codes qui existent dans la garde-robe.
- "missing_pieces" est un tableau vide si rien ne manque.`;

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Le chatbot n'est pas configuré : ajoute GEMINI_API_KEY dans .env.local, puis redémarre le serveur." },
        { status: 503 }
      );
    }

    // 1) Qui est connecté ?
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "Connecte-toi pour utiliser le styliste." }, { status: 401 });

    // Ce client agit AVEC l'identité de l'utilisateur : les règles RLS ne lui montrent que SES données
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return NextResponse.json({ error: "Session expirée : reconnecte-toi." }, { status: 401 });
    }

    // 2) Vérifier et nettoyer la demande
    const body = await req.json().catch(() => null);
    const rawMessages: unknown = body?.messages;
    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      return NextResponse.json({ error: "Message manquant." }, { status: 400 });
    }
    const messages: ChatMessage[] = rawMessages
      .filter(
        (m): m is ChatMessage =>
          m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
      )
      .map((m) => ({ role: m.role, content: m.content.slice(0, 1500) }))
      .slice(-10);
    if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
      return NextResponse.json({ error: "Message invalide." }, { status: 400 });
    }
    const city = typeof body.city === "string" ? body.city.trim().slice(0, 80) : "";
    const tz = typeof body.timeZone === "string" && isValidTimeZone(body.timeZone) ? body.timeZone : "UTC";

    // 3) Consentement : le styliste ne lit la garde-robe que si l'utilisateur l'a autorisé
    const { data: prefs } = await supabase
      .from("user_preferences")
      .select("stylist_wardrobe_consent, preferred_styles, preferred_colors, preferred_brands, budget_min, budget_max")
      .maybeSingle();
    const consent = !!prefs?.stylist_wardrobe_consent;

    const codeToItem = new Map<string, WardrobeRow>();
    let wardrobeBlock = "ACCÈS À LA GARDE-ROBE : non autorisé par l'utilisateur.";
    let eventsBlock = "";
    let eventsCount = 0;

    if (consent) {
      const { data: items } = await supabase
        .from("wardrobe_items")
        .select("id, name, category, color, brand, size, seasons, styles, waterproof, warmth_level, image_path")
        .order("created_at", { ascending: false })
        .limit(200);

      const list = (items ?? []) as unknown as WardrobeRow[];
      list.forEach((it, i) => codeToItem.set(`v${i + 1}`, it));

      if (list.length === 0) {
        wardrobeBlock = "GARDE-ROBE : vide (l'utilisateur n'a encore ajouté aucun vêtement).";
      } else {
        const lines = list.map((it, i) => {
          const parts = [
            `v${i + 1}`,
            it.name,
            `catégorie: ${it.category}`,
            it.color ? `couleur: ${it.color}` : null,
            it.brand ? `marque: ${it.brand}` : null,
            it.seasons?.length ? `saisons: ${it.seasons.join(", ")}` : null,
            it.styles?.length ? `styles: ${it.styles.join(", ")}` : null,
            `imperméable: ${it.waterproof ? "oui" : "non indiqué"}`,
            it.warmth_level ? `chaleur: ${it.warmth_level}/5` : null,
          ].filter(Boolean);
          return parts.join(" | ");
        });
        wardrobeBlock = `GARDE-ROBE (${list.length} vêtements, données réelles saisies par l'utilisateur) :\n${lines.join("\n")}`;
      }

      // Événements des 7 prochains jours
      const now = new Date();
      const in7 = new Date(now.getTime() + 7 * 86400000);
      const { data: events } = await supabase
        .from("events")
        .select("title, event_type, location, starts_at, dress_code, preferences")
        .gte("starts_at", now.toISOString())
        .lte("starts_at", in7.toISOString())
        .order("starts_at", { ascending: true })
        .limit(10);
      if (events && events.length > 0) {
        eventsCount = events.length;
        eventsBlock =
          "ÉVÉNEMENTS À VENIR (calendrier de l'utilisateur) :\n" +
          events
            .map((ev) => {
              const when = new Date(ev.starts_at).toLocaleString("fr-FR", {
                dateStyle: "full",
                timeStyle: "short",
                timeZone: tz,
              });
              return [
                `- ${when}`,
                ev.title,
                ev.event_type ? `type: ${ev.event_type}` : null,
                ev.location ? `lieu: ${ev.location}` : null,
                ev.dress_code ? `dress code: ${ev.dress_code}` : null,
                ev.preferences ? `préférences: ${ev.preferences}` : null,
              ]
                .filter(Boolean)
                .join(" | ");
            })
            .join("\n");
      }
    }

    // 4) Météo réelle (si l'utilisateur a indiqué une ville)
    let weatherBlock = "PRÉVISIONS MÉTÉO : non disponibles (aucune ville indiquée ou ville introuvable).";
    let weatherCity: string | null = null;
    if (city) {
      const place = await geocodeCity(city);
      if (place) {
        const lines = await forecastLines(place.lat, place.lon);
        if (lines.length > 0) {
          weatherCity = place.label;
          weatherBlock = `PRÉVISIONS MÉTÉO RÉELLES pour ${place.label} :\n${lines.join("\n")}`;
        }
      }
    }

    // 5) Préférences saisies par l'utilisateur
    const prefLines: string[] = [];
    if (consent && prefs) {
      if (prefs.preferred_styles?.length) prefLines.push(`styles préférés: ${prefs.preferred_styles.join(", ")}`);
      if (prefs.preferred_colors?.length) prefLines.push(`couleurs préférées: ${prefs.preferred_colors.join(", ")}`);
      if (prefs.preferred_brands?.length) prefLines.push(`marques préférées: ${prefs.preferred_brands.join(", ")}`);
      if (prefs.budget_max) prefLines.push(`budget maximum: ${prefs.budget_max}`);
    }

    const today = new Date().toLocaleDateString("fr-FR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: tz,
    });
    const todayIso = new Date().toLocaleDateString("en-CA", { timeZone: tz });

    const system = [
      SYSTEM_RULES,
      `DATE D'AUJOURD'HUI : ${today} (${todayIso})`,
      wardrobeBlock,
      eventsBlock,
      weatherBlock,
      prefLines.length ? `PRÉFÉRENCES : ${prefLines.join(" ; ")}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    // 6) Appel du modèle (Google Gemini). Le nom du modèle se règle dans .env.local
    const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
          generationConfig: { temperature: 0.7, responseMimeType: "application/json" },
        }),
      }
    );

    if (!aiRes.ok) {
      console.error("Gemini error", aiRes.status, await aiRes.text().catch(() => ""));
      const map: Record<number, string> = {
        400: "La requête a été refusée : vérifie ta clé GEMINI_API_KEY.",
        403: "La clé GEMINI_API_KEY n'a pas l'autorisation d'utiliser ce modèle.",
        404: "Modèle introuvable : change GEMINI_MODEL dans .env.local (voir la liste des modèles dans Google AI Studio).",
        429: "Limite gratuite atteinte : attends une minute puis réessaie.",
      };
      return NextResponse.json(
        { error: map[aiRes.status] ?? "Le service d'IA est indisponible pour le moment." },
        { status: 502 }
      );
    }

    const aiJson = await aiRes.json();
    const rawText: string =
      aiJson.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    let parsed: {
      reply?: unknown;
      outfits?: { name?: unknown; item_codes?: unknown; reason?: unknown }[];
      missing_pieces?: { category?: unknown; reason?: unknown }[];
    };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { reply: rawText || "Je n'ai pas réussi à formuler une réponse, peux-tu reformuler ?" };
    }

    // 7) ANTI-INVENTION : on ne garde que les vêtements qui existent vraiment dans la garde-robe
    const outfits = (Array.isArray(parsed.outfits) ? parsed.outfits : [])
      .slice(0, 3)
      .map((o) => {
        const codes = Array.isArray(o.item_codes) ? (o.item_codes as unknown[]) : [];
        const seen = new Set<string>();
        const items = codes
          .map((c) => (typeof c === "string" ? codeToItem.get(c.trim().toLowerCase()) : undefined))
          .filter((it): it is WardrobeRow => !!it && !seen.has(it.id) && !!seen.add(it.id))
          .map((it) => ({ id: it.id, name: it.name, category: it.category, image_path: it.image_path }));
        return {
          name: typeof o.name === "string" && o.name.trim() ? o.name.trim().slice(0, 80) : "Tenue proposée",
          reason: typeof o.reason === "string" ? o.reason.slice(0, 400) : "",
          items,
        };
      })
      .filter((o) => o.items.length >= 2);

    // 8) Marketplace : seulement si une pièce manque vraiment (articles de DÉMONSTRATION pour l'instant)
    const suggestions = (Array.isArray(parsed.missing_pieces) ? parsed.missing_pieces : [])
      .slice(0, 2)
      .flatMap((mp) => {
        const cat = typeof mp.category === "string" ? mp.category : "";
        const wanted = DEMO_MATCH[cat] ?? [];
        const product = DEMO_PRODUCTS.find((p) => wanted.includes(p.category));
        if (!product) return [];
        return [
          {
            id: product.id,
            title: product.title,
            brand: product.brand,
            price: product.price,
            currency: product.currency,
            category: product.category,
            reason: typeof mp.reason === "string" ? mp.reason.slice(0, 300) : "",
          },
        ];
      });

    return NextResponse.json({
      reply: typeof parsed.reply === "string" && parsed.reply.trim() ? parsed.reply : "Voici mes idées.",
      outfits,
      suggestions,
      meta: {
        wardrobeUsed: consent && codeToItem.size > 0,
        itemCount: codeToItem.size,
        weatherCity,
        eventsCount,
      },
    });
  } catch (err) {
    console.error("Stylist route error", err);
    return NextResponse.json({ error: "Une erreur inattendue est survenue." }, { status: 500 });
  }
}