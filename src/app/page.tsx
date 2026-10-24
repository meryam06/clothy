import Image from "next/image";
import Link from "next/link";
import ProductCard from "../components/ProductCard";
import { getProducts } from "../lib/products";

export const dynamic = "force-dynamic"; // les nouvelles annonces doivent apparaître tout de suite

export default async function Home() {
  const products = await getProducts();

  return (
    <>
      {/* Bannière : l'image de fleurs est le fond (public/hero-flowers.jpg) */}
      <section className="relative isolate overflow-hidden">
        <Image
          src="/hero-flowers.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover"
        />

        <div className="mx-auto flex min-h-104 max-w-6xl flex-col items-center justify-center gap-6 px-4 py-20 text-center md:min-h-128">
          <h1 className="max-w-3xl text-4xl font-semibold md:text-6xl">Bienvenue sur Clothy</h1>
          <p className="max-w-xl text-lg">
            Votre assistant personnel de garde-robe et styliste propulsé par l&apos;IA. Organisez
            vos tenues et créez votre style en toute simplicité.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/shop" className="btn btn-primary">Explorer le shop</Link>
            <Link href="/stylist" className="btn bg-white/60">Rencontrer ton styliste</Link>
          </div>
        </div>
      </section>

      {/* Les 3 premiers produits : les vraies annonces passent avant la démonstration */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="mb-6 text-2xl font-semibold">Nouveautés populaires</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {products.slice(0, 3).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </>
  );
}