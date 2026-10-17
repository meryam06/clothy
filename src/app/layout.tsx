import Navbar from '../components/Navbar';
import type { ReactNode } from "react";
import Footer from '../components/Footer';
import './globals.css';

export const metadata = {
  title: 'clothy - Garde-robe & Styliste AI',
  description: 'Application de gestion de tenue vestimentaire',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen flex flex-col justify-between">
        <Navbar />
        <main className="flex-1 p-6">{children}</main>
        <Footer />
      </body>
    </html>
  );
}