import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import type { ReactNode } from "react";

export function Shell({ children, title }: { children: ReactNode; title?: string }) {
  const { role, signOut, user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background sticky top-0 z-10">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-7 w-7 bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display text-xs">R</span>
            </div>
            <span className="font-display text-sm tracking-wider">RUGBY · PERF</span>
          </Link>
          <nav className="flex items-center gap-1">
            {role === "atleta" && (
              <>
                <Link to="/atleta" className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider hover:bg-accent">Hoy</Link>
                <Link to="/atleta/perfil" className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider hover:bg-accent">Perfil</Link>
              </>
            )}
            {role === "coach" && (
              <Link to="/coach" className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider hover:bg-accent">Panel</Link>
            )}
            {user && (
              <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate({ to: "/login" }); }}>
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        {title && <h1 className="text-3xl mb-6">{title}</h1>}
        {children}
      </main>
    </div>
  );
}
