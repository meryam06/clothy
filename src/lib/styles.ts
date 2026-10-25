// src/lib/styles.ts
// Listes partagées : styles de mode et saisons.
// Utilisées par la page Discover Styles, les filtres du shop et le formulaire de vente.

// image : chemin d'une photo rangée dans public/styles/ (facultatif : sans photo, la carte reste un bloc de couleur)
// imageAlt : description courte de la photo, lue par les lecteurs d'écran
export type FashionStyle = {
  name: string;
  description: string;
  image?: string;
  imageAlt?: string;
};

export const STYLES: FashionStyle[] = [
  {
    name: "Streetwear",
    description: "Coupes amples, sneakers et attitude urbaine.",
    image: "/styles/streetwear.jpg",
    imageAlt: "Look streetwear : blouson en cuir marron oversize, sweat gris à capuche et jean large",
  },
  {
    name: "Minimalist",
    description: "Lignes épurées, couleurs neutres, l'essentiel bien choisi.",
    image: "/styles/minimalist.jpg",
    imageAlt: "Look minimaliste en noir et blanc : haut ajusté noir et jean large foncé",
  },
  {
    name: "Old Money",
    description: "Élégance discrète : matières nobles, coupes classiques.",
    image: "/styles/old-money.jpg",
    imageAlt: "Look old money : chemise blanche sous un haut rayé noir, pantalon large gris anthracite et mocassins noirs",
  },
  {
    name: "Casual",
    description: "Confortable et simple pour tous les jours.",
    image: "/styles/casual.jpg",
    imageAlt: "Look décontracté : grand pull rayé vert, blanc et orange sur un jean",
  },
  {
    name: "Chic",
    description: "Raffiné et soigné, pour se sentir élégante sans effort.",
    image: "/styles/chic.jpg",
    imageAlt: "Look chic : pull col roulé chocolat, mini-jupe en cuir verni et collants fins",
  },
  {
    name: "Classic",
    description: "Des pièces intemporelles qui ne se démodent pas.",
    image: "/styles/classic.jpg",
    imageAlt: "Look classique : débardeur noir, jean large délavé et sandales à talons noires",
  },
  {
    name: "Vintage",
    description: "Pièces d'une autre époque, à l'histoire unique.",
    image: "/styles/vintage.jpg",
    imageAlt: "Look vintage : haut noir à manches bouffantes, pantalon blanc très ample à fine ceinture, devant un buffet en bois",
  },
  {
    name: "Bohemian",
    description: "Libre et inspirée : motifs, fluidité et matières naturelles.",
    image: "/styles/bohemian.jpg",
    imageAlt: "Look bohème : haut en voile vert à manches évasées, jupe asymétrique imprimé léopard et bottes marron",
  },
  {
    name: "Sporty",
    description: "Pratique et dynamique, inspiré du sport.",
    image: "/styles/sporty.jpg",
    imageAlt: "Look sporty : maillot de football rouge et bleu marine, pantalon noir ample et baskets argentées",
  },
  {
    name: "Formal",
    description: "Pour les cérémonies, le travail et les grandes occasions.",
    image: "/styles/formal.jpg",
    imageAlt: "Look formel : chemise blanche, cravate noire et pantalon noir à jambes droites",
  },
];

export const SEASONS = [
  { value: "spring", label: "Printemps" },
  { value: "summer", label: "Été" },
  { value: "autumn", label: "Automne" },
  { value: "winter", label: "Hiver" },
];