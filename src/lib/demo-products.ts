// DONNÉES DE DÉMONSTRATION : ce ne sont PAS de vrais produits ni un vrai stock.
// Plus tard, on les remplacera par les produits de la table "products" de Supabase.

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
  isSecondHand: boolean;
  isNew: boolean;
  description: string;
};

export const CONDITION_LABEL: Record<Condition, string> = {
  new: "Neuf",
  like_new: "Comme neuf",
  good: "Bon état",
  fair: "État correct",
};

export const DEMO_PRODUCTS: Product[] = [
  { id: "1", title: "Trench beige classique", brand: "Atelier Démo", price: 899, currency: "MAD", category: "Coats", size: "M", color: "Beige", condition: "new", seller: "Clothy (catalogue démo)", styles: ["Classic", "Chic"], isSecondHand: false, isNew: true, description: "Trench long en coton, coupe droite. Produit de démonstration." },
  { id: "2", title: "Sneakers blanches", brand: "Maison Test", price: 499, currency: "MAD", category: "Sneakers", size: "42", color: "Blanc", condition: "new", seller: "Clothy (catalogue démo)", styles: ["Casual", "Minimalist"], isSecondHand: false, isNew: true, description: "Sneakers en cuir blanc, semelle fine. Produit de démonstration." },
  { id: "3", title: "Jean droit brut", brand: "Denim Démo", price: 350, currency: "MAD", category: "Jeans", size: "L", color: "Bleu", condition: "good", seller: "Sara (vendeuse démo)", styles: ["Streetwear", "Casual"], isSecondHand: true, isNew: false, description: "Jean droit porté quelques fois. Annonce de démonstration." },
  { id: "4", title: "Chemise en lin", brand: "Atelier Démo", price: 280, currency: "MAD", category: "Shirts", size: "M", color: "Écru", condition: "like_new", seller: "Youssef (vendeur démo)", styles: ["Minimalist", "Old Money"], isSecondHand: true, isNew: true, description: "Chemise légère pour l'été. Annonce de démonstration." },
  { id: "5", title: "Sac cabas en cuir", brand: "Maison Test", price: 650, currency: "MAD", category: "Bags", size: "Unique", color: "Noir", condition: "new", seller: "Clothy (catalogue démo)", styles: ["Chic", "Classic"], isSecondHand: false, isNew: false, description: "Grand sac cabas. Produit de démonstration." },
  { id: "6", title: "Pull en maille épais", brand: "Nordic Démo", price: 420, currency: "MAD", category: "Knitwear", size: "S", color: "Crème", condition: "good", seller: "Lina (vendeuse démo)", styles: ["Casual", "Old Money"], isSecondHand: true, isNew: false, description: "Pull chaud en laine mélangée. Annonce de démonstration." },
  { id: "7", title: "Robe fleurie légère", brand: "Atelier Démo", price: 390, currency: "MAD", category: "Dresses", size: "M", color: "Vert", condition: "new", seller: "Clothy (catalogue démo)", styles: ["Bohemian", "Chic"], isSecondHand: false, isNew: true, description: "Robe midi à motifs. Produit de démonstration." },
  { id: "8", title: "Écharpe en laine", brand: "Nordic Démo", price: 150, currency: "MAD", category: "Scarves", size: "Unique", color: "Gris", condition: "like_new", seller: "Nour (vendeuse démo)", styles: ["Classic", "Formal"], isSecondHand: true, isNew: false, description: "Écharpe douce et chaude. Annonce de démonstration." },
];

export const CATEGORIES = Array.from(new Set(DEMO_PRODUCTS.map((p) => p.category))).sort();
