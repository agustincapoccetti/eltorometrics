import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "El Toro Rugby Performance · Rendimiento del plantel" },
      { name: "description", content: "Monitoreo de RPE, bienestar, carga y recuperación para El Toro Rugby Club Calvià." },
      { property: "og:title", content: "El Toro Rugby Performance" },
      { property: "og:description", content: "Monitoreo de RPE, bienestar, carga y recuperación para El Toro Rugby Club Calvià." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (user && role === "atleta") navigate({ to: "/atleta" });
    else if (user && role === "coach") navigate({ to: "/coach" });
  }, [user, role, loading, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-4 py-4">
          <Logo />
          <div className="flex gap-2">
            <Link to="/login"><Button variant="ghost" size="sm">Entrar</Button></Link>
            <Link to="/registro"><Button size="sm">Registro</Button></Link>
          </div>
        </div>
      </header>
      <section className="flex-1 flex items-center">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <Logo size={140} withText={false} className="mb-8" />
          <h1 className="text-6xl md:text-8xl leading-none">
            Rendimiento.<br />Recuperación.<br />Resultados.
          </h1>
          <p className="mt-6 text-base text-muted-foreground max-w-xl mx-auto">
            Plataforma oficial de El Toro Rugby Club Calvià: monitoreo de RPE, bienestar, carga de entrenamiento y recuperación. Datos claros para atletas y preparadores físicos.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/login"><Button size="lg" className="w-full sm:w-48">Entrar</Button></Link>
            <Link to="/registro"><Button size="lg" variant="outline" className="w-full sm:w-48">Crear cuenta</Button></Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} El Toro Rugby Performance · Calvià
      </footer>
    </div>
  );
}
