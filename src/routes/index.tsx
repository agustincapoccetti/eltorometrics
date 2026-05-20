import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Landing });

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
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display text-xs">R</span>
            </div>
            <span className="font-display text-sm tracking-wider">RUGBY · PERF</span>
          </div>
          <div className="flex gap-2">
            <Link to="/login"><Button variant="ghost" size="sm">Entrar</Button></Link>
            <Link to="/registro"><Button size="sm">Registro</Button></Link>
          </div>
        </div>
      </header>
      <section className="flex-1 flex items-center">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-6xl md:text-8xl leading-none">
            Rendimiento.<br />Recuperación.<br />Resultados.
          </h1>
          <p className="mt-6 text-base text-muted-foreground max-w-xl mx-auto">
            Monitoreo semanal de RPE y bienestar para el club de rugby. Datos claros para atletas y preparadores físicos.
          </p>
          <div className="mt-10 flex justify-center gap-3">
            <Link to="/registro"><Button size="lg">Crear cuenta</Button></Link>
            <Link to="/login"><Button size="lg" variant="outline">Iniciar sesión</Button></Link>
          </div>
        </div>
      </section>
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Rugby Performance
      </footer>
    </div>
  );
}
