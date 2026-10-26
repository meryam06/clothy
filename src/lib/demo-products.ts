// DONNÉES DE DÉMONSTRATION : ce ne sont PAS de vrais produits ni un vrai stock.
// Les marques et les prix sont des estimations. Les vraies annonces se publient depuis la page /sell.

export type Condition = "new" | "like_new" | "good" | "fair";

export type Product = {
  id: string;
  title: string;
  brand: string;
  price: number;
  currency: string;
  category: string;
  size: string;
  color: string;
  condition: Condition;
  seller: string;
  styles: string[];
  seasons?: string[];
  isSecondHand: boolean;
  isNew: boolean;
  description: string;
  // Photos rangées dans public/demo/ : la 1re est celle de la carte, les suivantes sont sur la fiche produit
  images?: string[];
  // Position (en %) du point sur la photo : c'est là que s'affiche l'étiquette de prix quand on clique sur l'image
  hotspot?: { x: number; y: number };
};

export const CONDITION_LABEL: Record<Condition, string> = {
  new: "Neuf",
  like_new: "Comme neuf",
  good: "Bon état",
  fair: "État correct",
};

export const DEMO_PRODUCTS: Product[] = [
  {
    id: "1",
    title: "Pull fin flou « June »",
    brand: "June",
    price: 200,
    currency: "MAD",
    category: "Knitwear",
    size: "S / M",
    color: "Orange vif",
    condition: "like_new",
    seller: "Vendeur démo",
    styles: ["Casual"],
    seasons: ["spring", "autumn"],
    isSecondHand: true,
    isNew: true,
    description:
      "Pull léger à encolure ronde et coupe souple (slouchy) en maille fine semi-transparente. Sur la photo, il est porté avec un jean très large délavé et des baskets orange.",
    images: ["/demo/pull-june.jpg", "/demo/pull-june-look.jpg"],
    hotspot: { x: 55, y: 47 },
  },
  {
    id: "2",
    title: "Veste sans manches utilitaire multi-poches",
    brand: "Urban Outfitters",
    price: 350,
    currency: "MAD",
    category: "Jackets",
    size: "M / L",
    color: "Vert olive / kaki",
    condition: "like_new",
    seller: "Vendeur démo",
    styles: ["Bohemian", "Casual"],
    seasons: ["autumn", "spring"],
    isSecondHand: true,
    isNew: true,
    description:
      "Gilet sans manches style baroudeur à poches multiples, fermeture zippée et empiècements robustes. Sur la photo, il est porté sur un haut blanc à manches longues, avec un pantalon large marron et un sac orange.",
    images: ["/demo/gilet-utilitaire.jpg", "/demo/gilet-utilitaire-look.jpg"],
    hotspot: { x: 40, y: 60 },
  },
  {
    id: "3",
    title: "Top asymétrique halter à carreaux",
    brand: "Motel Rocks",
    price: 350,
    currency: "MAD",
    category: "Tops",
    size: "XS / S",
    color: "Marron, beige et noir",
    condition: "like_new",
    seller: "Vendeur démo",
    styles: ["Vintage", "Chic"],
    seasons: ["spring", "summer"],
    isSecondHand: true,
    isNew: true,
    description:
      "Haut près du corps, sans manches, à col drapé et motif écossais (tartan) avec de subtils détails de strass. Sur la photo, il est porté avec un jean évasé délavé à ceinture chaîne.",
    images: ["/demo/top-carreaux.jpg", "/demo/top-carreaux-look.jpg"],
    hotspot: { x: 51, y: 48 },
  },
  {
    id: "4",
    title: "Chemisier blanc ample à poches poitrine",
    brand: "Mango",
    price: 70,
    currency: "MAD",
    category: "Shirts",
    size: "S / M (coupe ample)",
    color: "Blanc pur",
    condition: "like_new",
    seller: "Vendeur démo",
    styles: ["Classic", "Minimalist"],
    seasons: ["spring", "summer"],
    isSecondHand: true,
    isNew: false,
    description:
      "Chemise blanche décontractée à col classique, patte de boutonnage et grandes poches à rabat sur la poitrine. Sur la photo, elle est portée avec un jean large brut et un sac noir matelassé.",
    images: ["/demo/chemisier-blanc.jpg", "/demo/chemisier-blanc-look.jpg"],
    hotspot: { x: 49, y: 47 },
  },
  {
    id: "5",
    title: "Veste courte en jean effet délavé",
    brand: "Bershka",
    price: 300,
    currency: "MAD",
    category: "Jackets",
    size: "S / M",
    color: "Gris anthracite / noir délavé",
    condition: "like_new",
    seller: "Vendeur démo",
    styles: ["Streetwear", "Casual"],
    seasons: ["autumn", "spring"],
    isSecondHand: true,
    isNew: false,
    description:
      "Veste courte et structurée en denim gris foncé / noir effet usagé, avec col chemise et boutons métalliques. Sur la photo, elle est portée sur un t-shirt blanc court et un jean large gris délavé.",
    images: ["/demo/veste-jean-grise.jpg", "/demo/veste-jean-grise-look.jpg"],
    hotspot: { x: 27, y: 27 },
  },
  {
    id: "6",
    title: "Ensemble tailleur jupette et veste militaire en denim",
    brand: "Retrofête",
    price: 150,
    currency: "MAD",
    category: "Sets",
    size: "S / M",
    color: "Bleu denim foncé (indigo brut)",
    condition: "like_new",
    seller: "Vendeur démo",
    styles: ["Chic", "Vintage"],
    seasons: ["autumn", "winter"],
    isSecondHand: true,
    isNew: false,
    description:
      "Ensemble coordonné en jean brut : mini-jupe droite et veste cintrée à fermeture zippée frontale et multiples boutons décoratifs de style militaire. Sur la photo, il est porté avec des bottes hautes marron et une pochette en cuir marron.",
    images: ["/demo/ensemble-denim.jpg", "/demo/ensemble-denim-look.jpg"],
    hotspot: { x: 50, y: 55 },
  },
];

export const CATEGORIES = Array.from(new Set(DEMO_PRODUCTS.map((p) => p.category))).sort();