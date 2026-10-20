"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../../lib/supabase/client";

// ---------- Listes de choix ----------
const OCCASIONS = [
  { value: "university", label: "Université" },
  { value: "work", label: "Travail" },
  { value: "party", label: "Soirée" },
  { value: "wedding", label: "Mariage" },
  { value: "travel", label: "Voyage" },
  { value: "date", label: "Rendez-vous" },
  { value: "everyday", label: "Tous les jours" },
  { value: "other", label: "Autre" },
];

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// ---------- Types ----------
// Un événement (table "events")
type EventRow = {
  id: string;
  title: string;
  event_type: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  starts_at: string;
  ends_at: string | null;
  dress_code: string | null;
  preferences: string | null;
  outfit_id: string | null;
};

// Un vêtement (colonnes utiles pour juger si une tenue convient à la météo)
type WardrobeItem = {
  id: string;
  name: string;
  category: string;
  waterproof: boolean;
  warmth_level: number | null;
};

// Une tenue enregistrée et la liste de ses vêtements
type OutfitRow = {
  id: string;
  name: string;
  occasion: string | null;
  outfit_items: { wardrobe_item_id: string }[];
};

// Prévision météo d'une journée (Open-Meteo)
type Weather = {
  tmax: number;
  tmin: number;
  rainProb: number | null;
  wind: number;
  code: number;
};
type WeatherState =
  | { status: "ok"; data: Weather }
  | { status: "unavailable"; reason: string };

const inputClass = "w-full border bg-white px-3 py-2 text-sm text-black";

// ---------- Petites fonctions utilitaires ----------
function dateKey(d: Date | string): string {
  const x = typeof d === "string" ? new Date(d) : d;
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${x.getFullYear()}-${m}-${day}`;
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function occasionLabel(value: string | null): string {
  if (!value) return "";
  return OCCASIONS.find((o) => o.value === value)?.label ?? value;
}

function weatherDescription(code: number): string {
  if (code === 0) return "Ciel dégagé";
  if (code >= 1 && code <= 3) return "Peu à très nuageux";
  if (code === 45 || code === 48) return "Brouillard";
  if (code >= 51 && code <= 57) return "Bruine";
  if (code >= 61 && code <= 67) return "Pluie";
  if (code >= 71 && code <= 77) return "Neige";
  if (code >= 80 && code <= 82) return "Averses";
  if (code === 85 || code === 86) return "Averses de neige";
  if (code >= 95) return "Orage";
  return "Conditions variables";
}

// Recherche les coordonnées d'un lieu (service gratuit Open-Meteo, sans clé)
async function geocode(place: string) {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1&language=fr&format=json`;
    const res = await fetch(url);
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

// Récupère la prévision du jour de l'événement (jusqu'à 16 jours à l'avance)
async function fetchWeather(ev: EventRow): Promise<WeatherState> {
  if (ev.latitude == null || ev.longitude == null) {
    return { status: "unavailable", reason: "Aucun lieu reconnu pour cet événement." };
  }
  const day = dateKey(ev.starts_at);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (new Date(day + "T00:00:00").getTime() - today.getTime()) / 86400000
  );
  if (diffDays < 0) return { status: "unavailable", reason: "Cette date est passée." };
  if (diffDays > 15) {
    return {
      status: "unavailable",
      reason: "Les prévisions sont disponibles jusqu'à 16 jours à l'avance. Reviens plus près de la date.",
    };
  }
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${ev.latitude}&longitude=${ev.longitude}` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max` +
      `&timezone=auto&start_date=${day}&end_date=${day}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("http");
    const json = await res.json();
    const d = json.daily;
    if (!d || !d.time || d.time.length === 0) {
      return { status: "unavailable", reason: "Pas de prévision reçue pour ce jour." };
    }
    return {
      status: "ok",
      data: {
        tmax: d.temperature_2m_max[0],
        tmin: d.temperature_2m_min[0],
        rainProb: d.precipitation_probability_max?.[0] ?? null,
        wind: d.wind_speed_10m_max[0],
        code: d.weather_code[0],
      },
    };
  } catch {
    return { status: "unavailable", reason: "Service météo indisponible pour le moment." };
  }
}

// Conseils généraux selon la météo
function weatherAdvice(w: Weather): string[] {
  const tips: string[] = [];
  if (w.rainProb !== null && w.rainProb >= 50) {
    tips.push(`Pluie probable (${w.rainProb} %) : prévois une veste et des chaussures imperméables.`);
  } else if (w.rainProb !== null && w.rainProb >= 30) {
    tips.push(`Risque de pluie (${w.rainProb} %) : une veste déperlante est prudente.`);
  }
  if (w.tmax >= 28) tips.push("Il fera très chaud : choisis des matières légères et respirantes.");
  else if (w.tmax <= 10) tips.push("Il fera froid : superpose plusieurs couches (haut chaud + manteau).");
  else if (w.tmax <= 17) tips.push("Temps frais : ajoute une veste ou un pull.");
  if (w.tmax - w.tmin >= 10) {
    tips.push("Grand écart de température dans la journée : des couches faciles à retirer sont idéales.");
  }
  if (w.wind >= 30) tips.push("Vent fort : évite les pièces très légères ou très amples.");
  return tips;
}

// Vérifie une tenue (basée sur les infos que TOI tu as saisies dans ta garde-robe)
function outfitWarnings(items: WardrobeItem[], w: Weather): string[] {
  const warnings: string[] = [];
  if (w.rainProb !== null && w.rainProb >= 50 && !items.some((i) => i.waterproof)) {
    warnings.push("Pluie probable mais aucune pièce marquée « imperméable » dans cette tenue.");
  }
  if (w.tmax <= 10 && !items.some((i) => i.category === "jackets" || (i.warmth_level ?? 0) >= 3)) {
    warnings.push("Il fera froid : cette tenue n'a ni veste ni pièce chaude.");
  }
  if (w.tmax >= 28 && items.some((i) => (i.warmth_level ?? 0) >= 4)) {
    warnings.push("Il fera très chaud : cette tenue contient une pièce très chaude.");
  }
  return warnings;
}

export default function PlannerPage() {
  const [supabase] = useState(() => createClient());

  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [events, setEvents] = useState<EventRow[]>([]);
  const [outfits, setOutfits] = useState<OutfitRow[]>([]);
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([]);
  const [weather, setWeather] = useState<Record<string, WeatherState>>({});
  const [refreshTick, setRefreshTick] = useState(0);
  const requestedWeather = useRef<Set<string>>(new Set());

  // Calendrier
  const [month, setMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));

  // Formulaire
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState("university");
  const [date, setDate] = useState(() => dateKey(new Date()));
  const [time, setTime] = useState("09:00");
  const [location, setLocation] = useState("");
  const [dressCode, setDressCode] = useState("");
  const [preferences, setPreferences] = useState("");
  const [outfitId, setOutfitId] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Charge mes événements, mes tenues et mes vêtements (la base ne renvoie que les MIENS)
  const loadAll = useCallback(async () => {
    const [evRes, outRes, itemRes] = await Promise.all([
      supabase
        .from("events")
        .select("id, title, event_type, location, latitude, longitude, starts_at, ends_at, dress_code, preferences, outfit_id")
        .order("starts_at", { ascending: true }),
      supabase
        .from("outfits")
        .select("id, name, occasion, outfit_items(wardrobe_item_id)")
        .order("created_at", { ascending: false }),
      supabase.from("wardrobe_items").select("id, name, category, waterproof, warmth_level"),
    ]);

    if (evRes.error || outRes.error || itemRes.error) {
      setMessage(
        "Impossible de charger les données : " +
          (evRes.error?.message ?? outRes.error?.message ?? itemRes.error?.message)
      );
      return;
    }
    setEvents((evRes.data ?? []) as unknown as EventRow[]);
    setOutfits((outRes.data ?? []) as unknown as OutfitRow[]);
    setWardrobe((itemRes.data ?? []) as unknown as WardrobeItem[]);
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthChecked(true);
      if (data.user) loadAll();
    });
  }, [supabase, loadAll]);

  // Météo : chargée pour les événements du jour sélectionné
  useEffect(() => {
    const dayEvents = events.filter((e) => dateKey(e.starts_at) === selectedDate);
    dayEvents.forEach(async (ev) => {
      const key = `${ev.id}|${ev.starts_at}|${ev.latitude}|${ev.longitude}|${refreshTick}`;
      if (requestedWeather.current.has(key)) return;
      requestedWeather.current.add(key);
      const result = await fetchWeather(ev);
      setWeather((current) => ({ ...current, [ev.id]: result }));
    });
  }, [events, selectedDate, refreshTick]);

  function refreshWeather() {
    setWeather({});
    setRefreshTick((t) => t + 1);
  }

  function selectDay(key: string) {
    setSelectedDate(key);
    setDate(key);
  }

  function changeMonth(delta: number) {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  // Créer un événement
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    const startsAt = new Date(`${date}T${time || "09:00"}`);
    if (Number.isNaN(startsAt.getTime())) {
      setMessage("La date ou l'heure est invalide.");
      return;
    }

    setSaving(true);
    let lat: number | null = null;
    let lon: number | null = null;
    let placeLabel: string | null = location.trim() || null;
    let notice = "";

    if (location.trim()) {
      const found = await geocode(location.trim());
      if (found) {
        lat = found.lat;
        lon = found.lon;
        placeLabel = found.label;
      } else {
        notice = " Le lieu n'a pas été reconnu : pas de météo pour cet événement (écris seulement le nom de la ville, par exemple « Tétouan »).";
      }
    } else {
      notice = " Sans lieu, la météo ne peut pas être affichée.";
    }

    const { error } = await supabase.from("events").insert({
      title: title.trim(),
      event_type: eventType,
      location: placeLabel,
      latitude: lat,
      longitude: lon,
      starts_at: startsAt.toISOString(),
      dress_code: dressCode.trim() || null,
      preferences: preferences.trim() || null,
      outfit_id: outfitId || null,
    });

    if (error) {
      setMessage("Création impossible : " + error.message);
      setSaving(false);
      return;
    }

    setTitle("");
    setLocation("");
    setDressCode("");
    setPreferences("");
    setOutfitId("");
    setSelectedDate(date);
    setMonth(new Date(startsAt.getFullYear(), startsAt.getMonth(), 1));
    setMessage("Événement enregistré." + notice);
    await loadAll();
    setSaving(false);
  }

  async function deleteEvent(ev: EventRow) {
    if (!window.confirm(`Supprimer l'événement « ${ev.title} » ?`)) return;
    const { error } = await supabase.from("events").delete().eq("id", ev.id);
    if (error) {
      setMessage("Suppression impossible : " + error.message);
      return;
    }
    setEvents((list) => list.filter((x) => x.id !== ev.id));
  }

  // Lier (ou délier) une tenue à un événement
  async function setEventOutfit(ev: EventRow, newOutfitId: string | null) {
    const { error } = await supabase.from("events").update({ outfit_id: newOutfitId }).eq("id", ev.id);
    if (error) {
      setMessage("Modification impossible : " + error.message);
      return;
    }
    setEvents((list) => list.map((x) => (x.id === ev.id ? { ...x, outfit_id: newOutfitId } : x)));
  }

  // ---------- Affichage ----------
  if (!authChecked) {
    return <main className="mx-auto max-w-6xl px-4 py-12">Chargement…</main>;
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-3xl font-bold">Calendar &amp; Weather Planner</h1>
        <p className="mt-3">Ton calendrier est privé : connecte-toi pour planifier tes tenues.</p>
        <Link href="/login" className="mt-4 inline-block border px-5 py-2">Se connecter</Link>
      </main>
    );
  }

  const itemById = new Map(wardrobe.map((i) => [i.id, i]));
  const outfitById = new Map(outfits.map((o) => [o.id, o]));
  const itemsOfOutfit = (o: OutfitRow) =>
    o.outfit_items.map((oi) => itemById.get(oi.wardrobe_item_id)).filter((i): i is WardrobeItem => !!i);

  // Calendrier du mois (semaine commençant le lundi)
  const year = month.getFullYear();
  const m = month.getMonth();
  const offset = (new Date(year, m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => dateKey(new Date(year, m, i + 1))),
  ];

  const eventsByDate: Record<string, EventRow[]> = {};
  events.forEach((ev) => {
    const k = dateKey(ev.starts_at);
    (eventsByDate[k] ||= []).push(ev);
  });

  const todayKey = dateKey(new Date());
  const upcoming = events.filter((ev) => dateKey(ev.starts_at) >= todayKey).slice(0, 5);
  const dayEvents = eventsByDate[selectedDate] ?? [];

  // Tenues conseillées : uniquement parmi MES tenues enregistrées (donc mes vêtements)
  function suggestionsFor(ev: EventRow, state: WeatherState | undefined) {
    const w = state?.status === "ok" ? state.data : null;
    return outfits
      .map((o) => {
        const warnings = w ? outfitWarnings(itemsOfOutfit(o), w) : [];
        let score = o.occasion && o.occasion === ev.event_type ? 3 : 0;
        score -= warnings.length * 2;
        return { outfit: o, warnings, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold">Calendar &amp; Weather Planner</h1>
      <p className="mt-1 text-sm">Planifie tes événements, vois la météo et choisis la bonne tenue parmi tes vêtements.</p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* ----- Calendrier du mois ----- */}
        <section aria-label="Calendrier">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" onClick={() => changeMonth(-1)} aria-label="Mois précédent" className="border px-3 py-1">←</button>
            <h2 className="text-lg font-semibold capitalize">
              {month.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
            </h2>
            <button type="button" onClick={() => changeMonth(1)} aria-label="Mois suivant" className="border px-3 py-1">→</button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-1">{d}</div>
            ))}
            {cells.map((key, idx) =>
              key === null ? (
                <div key={`empty-${idx}`} />
              ) : (
                <button
                  key={key}
                  type="button"
                  onClick={() => selectDay(key)}
                  aria-pressed={key === selectedDate}
                  className={`aspect-square p-1 text-sm ${key === selectedDate ? "border-4" : "border"} ${key === todayKey ? "font-bold underline" : ""}`}
                >
                  {Number(key.slice(8))}
                  {eventsByDate[key] && (
                    <span className="block text-xs">● {eventsByDate[key].length}</span>
                  )}
                </button>
              )
            )}
          </div>

          <h3 className="mt-6 font-semibold">À venir</h3>
          {upcoming.length === 0 ? (
            <p className="mt-1 text-sm">Aucun événement à venir.</p>
          ) : (
            <ul className="mt-1 space-y-1 text-sm">
              {upcoming.map((ev) => (
                <li key={ev.id}>
                  <button
                    type="button"
                    className="underline"
                    onClick={() => {
                      const d = new Date(ev.starts_at);
                      setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                      selectDay(dateKey(d));
                    }}
                  >
                    {new Date(ev.starts_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}{" "}
                    {timeLabel(ev.starts_at)} · {ev.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ----- Événements du jour sélectionné ----- */}
        <section aria-label="Événements du jour">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold capitalize">
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h2>
            <button type="button" onClick={refreshWeather} className="border px-3 py-1 text-xs">
              Actualiser la météo
            </button>
          </div>

          {dayEvents.length === 0 ? (
            <p className="text-sm">Aucun événement ce jour-là. Ajoute-en un avec le formulaire.</p>
          ) : (
            <div className="space-y-4">
              {dayEvents.map((ev) => {
                const state = weather[ev.id];
                const linked = ev.outfit_id ? outfitById.get(ev.outfit_id) : undefined;
                const linkedItems = linked ? itemsOfOutfit(linked) : [];
                const w = state?.status === "ok" ? state.data : null;
                const suggestions = suggestionsFor(ev, state);

                return (
                  <article key={ev.id} className="border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">{ev.title}</h3>
                        <p className="text-xs">
                          {timeLabel(ev.starts_at)}
                          {ev.event_type ? ` · ${occasionLabel(ev.event_type)}` : ""}
                          {ev.location ? ` · ${ev.location}` : ""}
                        </p>
                        {ev.dress_code && <p className="text-xs">Dress code : {ev.dress_code}</p>}
                        {ev.preferences && <p className="text-xs">Préférences : {ev.preferences}</p>}
                      </div>
                      <button type="button" onClick={() => deleteEvent(ev)} className="text-xs underline">
                        Supprimer
                      </button>
                    </div>

                    {/* Météo */}
                    <div className="mt-3 border-t pt-3 text-sm">
                      {state === undefined && <p>Chargement de la météo…</p>}
                      {state?.status === "unavailable" && <p>Météo : {state.reason}</p>}
                      {w && (
                        <div>
                          <p className="font-semibold">
                            {weatherDescription(w.code)} · {Math.round(w.tmin)}° à {Math.round(w.tmax)}°C
                          </p>
                          <p className="text-xs">
                            Pluie : {w.rainProb !== null ? `${w.rainProb} %` : "non disponible"} · Vent max :{" "}
                            {Math.round(w.wind)} km/h
                          </p>
                          <ul className="mt-2 list-disc pl-5 text-xs">
                            {weatherAdvice(w).length === 0 ? (
                              <li>Pas de contrainte particulière pour cette journée.</li>
                            ) : (
                              weatherAdvice(w).map((tip) => <li key={tip}>{tip}</li>)
                            )}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Tenue liée */}
                    <div className="mt-3 border-t pt-3 text-sm">
                      {linked ? (
                        <div>
                          <p className="font-semibold">Tenue choisie : {linked.name}</p>
                          <p className="text-xs">{linkedItems.map((i) => i.name).join(" · ")}</p>
                          {w &&
                            (outfitWarnings(linkedItems, w).length === 0 ? (
                              <p className="mt-1 text-xs">
                                Cette tenue semble adaptée à la météo prévue (d&apos;après les infos de ta garde-robe).
                              </p>
                            ) : (
                              <ul className="mt-1 list-disc pl-5 text-xs">
                                {outfitWarnings(linkedItems, w).map((x) => (
                                  <li key={x}>{x}</li>
                                ))}
                              </ul>
                            ))}
                          <button type="button" onClick={() => setEventOutfit(ev, null)} className="mt-2 text-xs underline">
                            Retirer cette tenue
                          </button>
                        </div>
                      ) : outfits.length === 0 ? (
                        <p className="text-xs">
                          Tu n&apos;as pas encore de tenue.{" "}
                          <Link href="/outfits" className="underline">Crées-en une avec tes vêtements</Link>.
                        </p>
                      ) : (
                        <div>
                          <p className="font-semibold">Tenues conseillées (tes vêtements uniquement)</p>
                          <ul className="mt-2 space-y-2">
                            {suggestions.map(({ outfit, warnings }) => (
                              <li key={outfit.id} className="text-xs">
                                <span className="font-semibold">{outfit.name}</span>
                                {outfit.occasion === ev.event_type && outfit.occasion ? " (occasion correspondante)" : ""}
                                <br />
                                {itemsOfOutfit(outfit).map((i) => i.name).join(" · ")}
                                {warnings.map((x) => (
                                  <span key={x} className="block">⚠ {x}</span>
                                ))}
                                <button type="button" onClick={() => setEventOutfit(ev, outfit.id)} className="mt-1 block underline">
                                  Utiliser cette tenue
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* ----- Formulaire ----- */}
      <form onSubmit={handleSubmit} className="mt-8 grid gap-4 border p-4 md:grid-cols-2">
        <h2 className="text-xl font-semibold md:col-span-2">Ajouter un événement</h2>

        <div>
          <label htmlFor="title" className="block text-sm">Titre *</label>
          <input id="title" required value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex : Cours de 9h" className={inputClass} />
        </div>

        <div>
          <label htmlFor="eventType" className="block text-sm">Type</label>
          <select id="eventType" value={eventType} onChange={(e) => setEventType(e.target.value)} className={inputClass}>
            {OCCASIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="date" className="block text-sm">Date *</label>
          <input id="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label htmlFor="time" className="block text-sm">Heure</label>
          <input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label htmlFor="location" className="block text-sm">Lieu (pour la météo)</label>
          <input id="location" value={location} onChange={(e) => setLocation(e.target.value)}
            placeholder="Ex : Tétouan (nom de la ville seulement)" className={inputClass} />
        </div>

        <div>
          <label htmlFor="dressCode" className="block text-sm">Dress code</label>
          <input id="dressCode" value={dressCode} onChange={(e) => setDressCode(e.target.value)}
            placeholder="Ex : élégant décontracté" className={inputClass} />
        </div>

        <div>
          <label htmlFor="preferences" className="block text-sm">Préférences (facultatif)</label>
          <input id="preferences" value={preferences} onChange={(e) => setPreferences(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label htmlFor="outfitId" className="block text-sm">Tenue (facultatif)</label>
          <select id="outfitId" value={outfitId} onChange={(e) => setOutfitId(e.target.value)} className={inputClass}>
            <option value="">Je choisirai plus tard</option>
            {outfits.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <button type="submit" disabled={saving} className="border px-5 py-2">
            {saving ? "Enregistrement…" : "Ajouter l'événement"}
          </button>
        </div>
      </form>

      {message && <p role="status" className="mt-4 text-sm">{message}</p>}
    </main>
  );
}