"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ type: "error" | "info"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }, // lu par le trigger SQL pour créer le profil
      });
      if (error) {
        setMessage({ type: "error", text: error.message });
      } else if (data.session) {
        router.push("/");
        router.refresh();
      } else {
        setMessage({
          type: "info",
          text: "Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi.",
        });
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        router.push("/");
        router.refresh();
      }
    }
    setLoading(false);
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-6 text-3xl font-bold">
        {mode === "login" ? "Connexion" : "Créer un compte"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <div>
            <label htmlFor="name" className="block text-sm">Nom</label>
            <input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="field" />
          </div>
        )}
        <div>
          <label htmlFor="email" className="block text-sm">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="field" />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm">Mot de passe (6 caractères minimum)</label>
          <input id="password" type="password" required minLength={6} value={password}
            onChange={(e) => setPassword(e.target.value)} className="field" />
        </div>

        {message && (
          <p role="alert" className="text-sm">
            {message.type === "error" ? "Erreur : " : ""}{message.text}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? "Patiente…" : mode === "login" ? "Se connecter" : "S'inscrire"}
        </button>
      </form>

      <button type="button" className="mt-4 text-sm underline"
        onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(null); }}>
        {mode === "login" ? "Pas de compte ? Inscris-toi" : "Déjà un compte ? Connecte-toi"}
      </button>
    </main>
  );
}