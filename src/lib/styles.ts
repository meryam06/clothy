// src/lib/styles.ts
// Listes partagées : styles de mode et saisons.
// Utilisées par la page Discover Styles, les filtres du shop et le formulaire de vente.

export type FashionStyle = { name: string; description: string };

export const STYLES: FashionStyle[] = [
  { name: "Streetwear", description: "Coupes amples, sneakers et attitude urbaine." },
  { name: "Minimalist", description: "Lignes épurées, couleurs neutres, l'essentiel bien choisi." },
  { name: "Old Money", description: "Élégance discrète : matières nobles, coupes classiques." },
  { name: "Casual", description: "Confortable et simple pour tous les jours." },
  { name: "Chic", description: "Raffiné et soigné, pour se sentir élégante sans effort." },
  { name: "Classic", description: "Des pièces intemporelles qui ne se démodent pas." },
  { name: "Vintage", description: "Pièces d'une autre époque, à l'histoire unique." },
  { name: "Bohemian", description: "Libre et inspirée : motifs, fluidité et matières naturelles." },
  { name: "Sporty", description: "Pratique et dynamique, inspiré du sport." },
  { name: "Y2K", description: "Clin d'œil aux années 2000 : couleurs et audace." },
  { name: "Formal", description: "Pour les cérémonies, le travail et les grandes occasions." },
];

export const SEASONS = [
  { value: "spring", label: "Printemps" },
  { value: "summer", label: "Été" },
  { value: "autumn", label: "Automne" },
  { value: "winter", label: "Hiver" },
];