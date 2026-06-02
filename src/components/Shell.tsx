import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import { NotificationBell } from "@/components/NotificationBell";
import type { ReactNode } from "react";

const ADMIN_EMAIL = "agustincapoccetti@hotmail.com";

export function Shell({ children, title }: { children: ReactNode; title?: string }) {
  const { role, signOut, user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background sticky top-0 z-10">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-4 py-3">
          <Link to="/"><Logo /></Link>
          <nav className="flex items-center gap-1 flex-wrap">
            {role === "atleta" && (
              <>
                <NavLink to="/atleta">Hoy</NavLink>
                <NavLink to="/atleta/gym">Gym</NavLink>
                <NavLink to="/atleta/calendario">Calendario</NavLink>
                <NavLink to="/atleta/recuperacion">Recuperación</NavLink>
                <NavLink to="/atleta/fisio">Fisio</NavLink>
                <NavLink to="/atleta/biblioteca">Biblioteca</NavLink>
                <NavLink to="/atleta/perfil">Perfil</NavLink>
              </>
            )}
            {role === "coach" && (
              <>
                <NavLink to="/coach">Panel</NavLink>
                <NavLink to="/coach/gym">Gym</NavLink>
                <NavLink to="/coach/calendario">Calendario</NavLink>
                <NavLink to="/coach/recuperacion">Recuperación</NavLink>
                <NavLink to="/coach/fisio">Fisio</NavLink>
                <NavLink to="/coach/biblioteca">Biblioteca</NavLink>
                {isAdmin && <NavLink to="/coach/invitaciones">Invitaciones</NavLink>}
              </>
            )}
            {user && <NotificationBell />}
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

function NavLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="px-2.5 py-1.5 text-xs font-medium uppercase tracking-wider hover:bg-accent">
      {children}
    </Link>
  );
}
