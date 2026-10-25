import Image from "next/image";
import Link from "next/link";
import { getProducts } from "../../lib/products";
import { SEASONS, STYLES } from "../../lib/styles";

export const dynamic = "force-dynamic"; // les nombres d'articles doivent toujours être à jour

// Couleurs des blocs de texte (toutes lisibles avec leur texte, voir globals.css)
const BLOCKS = ["section-deep", "section-teal", "section-rose"];

export default async function StylesPage() {
  const products = await getProducts();

  // Nombre d'articles pour un style (sans tenir compte des majuscules)
  const countStyle = (name: string) =>
    products.filter((p) => p.styles.some((s) => s.toLowerCase() === name.toLowerCase())).length;
  const countSeason = (value: string) => products.filter((p) => p.seasons.includes(value)).length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-center text-4xl font-semibold md:text-5xl">Discover Styles</h1>
      <p className="mx-auto mt-3 max-w-xl text-center text-muted">
        Trouve ton style, ou essaie-en un nouveau. Choisis une ambiance pour voir les articles qui lui correspondent.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {STYLES.map((style, i) => {
          const n = countStyle(style.name);
          return (
            <Link
              key={style.name}
              href={`/shop?style=${encodeURIComponent(style.name)}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-line transition hover:-translate-y-0.5"
            >
              {/* Photo du style (si elle existe) : object-top garde le visage et le haut de la tenue */}
              {style.image && (
                <div className="relative aspect-[4/5] w-full overflow-hidden bg-line">
                  <Image
                    src={style.image}
                    alt={style.imageAlt ?? ""}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover object-top transition duration-500 group-hover:scale-105"
                  />
                </div>
              )}

              {/* Bloc de couleur avec le texte : sans photo, il remplit toute la carte */}
              <div
                className={`${BLOCKS[i % BLOCKS.length]} flex flex-1 flex-col justify-between p-6 ${
                  style.image ? "" : "min-h-44"
                }`}
              >
                <div>
                  <h2 className="text-2xl font-semibold">{style.name}</h2>
                  <p className="mt-2 text-sm">{style.description}</p>
                </div>
                <p className="mt-6 text-sm underline underline-offset-4">
                  {n === 0 ? "Bientôt des articles" : `${n} article${n > 1 ? "s" : ""} →`}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      <section className="mt-14" aria-label="Par saison">
        <h2 className="text-2xl font-semibold">Par saison</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {SEASONS.map((s) => (
            <Link key={s.value} href={`/shop?season=${s.value}`} className="btn">
              {s.label} ({countSeason(s.value)})
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-14 rounded-2xl border border-line bg-surface p-6" aria-label="Pour t'aider à choisir">
        <h2 className="text-2xl font-semibold">Pas sûre de ton style ?</h2>
        <p className="mt-2 max-w-xl text-muted">
          Ton styliste IA compose des tenues avec les vêtements que tu possèdes déjà, et te conseille selon la météo et tes événements.
        </p>
        <Link href="/stylist" className="btn btn-primary mt-4">Demander à mon styliste</Link>
      </section>
    </main>
  );
}