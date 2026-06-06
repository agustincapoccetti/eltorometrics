import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  Home,
  Dumbbell,
  Calendar,
  HeartPulse,
  Stethoscope,
  BookOpen,
  UserCircle,
  LayoutDashboard,
  Users,
  Trophy,
  Mail,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { NotificationBell } from "@/components/NotificationBell";
import type { ReactNode } from "react";

const ADMIN_EMAIL = "agustincapoccetti@hotmail.com";

type NavItem = { to: string; label: string; icon: LucideIcon };

const ATLETA_NAV: NavItem[] = [
  { to: "/atleta", label: "Hoy", icon: Home },
  { to: "/atleta/gym", label: "Gym", icon: Dumbbell },
  { to: "/atleta/calendario", label: "Calendario", icon: Calendar },
  { to: "/atleta/recuperacion", label: "Recup.", icon: HeartPulse },
  { to: "/atleta/fisio", label: "Fisio", icon: Stethoscope },
  { to: "/atleta/biblioteca", label: "Biblio", icon: BookOpen },
  { to: "/atleta/perfil", label: "Perfil", icon: UserCircle },
];

const COACH_NAV: NavItem[] = [
  { to: "/coach", label: "Panel", icon: LayoutDashboard },
  { to: "/coach/jugadores", label: "Jugadores", icon: Users },
  { to: "/coach/partidos", label: "Partidos", icon: Trophy },
  { to: "/coach/gym", label: "Gym", icon: Dumbbell },
  { to: "/coach/calendario", label: "Calendario", icon: Calendar },
  { to: "/coach/recuperacion", label: "Recup.", icon: HeartPulse },
  { to: "/coach/fisio", label: "Fisio", icon: Stethoscope },
  { to: "/coach/biblioteca", label: "Biblio", icon: BookOpen },
];

export function Shell({ children, title }: { children: ReactNode; title?: string }) {
  const { role, signOut, user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items: NavItem[] = role === "atleta"
    ? ATLETA_NAV
    : role === "coach"
      ? [...COACH_NAV, ...(isAdmin ? [{ to: "/coach/invitaciones", label: "Invitac.", icon: Mail }] : [])]
      : [];

  const isActive = (to: string) => {
    if (to === "/atleta" || to === "/coach") return pathname === to;
    return pathname === to || pathname.startsWith(to + "/");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="mx-auto max-w-6xl flex items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="shrink-0"><Logo /></Link>

          {items.length > 0 && (
            <nav
              className="flex-1 overflow-x-auto no-scrollbar mx-2"
              aria-label="Navegación principal"
            >
              <div className="flex items-center gap-1 min-w-max bg-zinc-900/60 dark:bg-zinc-900/70 border border-zinc-800 p-1.5 rounded-2xl shadow-sm backdrop-blur-sm">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={[
                        "group flex flex-col items-center justify-center px-3 py-1.5 rounded-xl transition-all duration-200",
                        active
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "text-zinc-400 hover:text-white hover:bg-zinc-800",
                      ].join(" ")}
                    >
                      <Icon className={`w-[18px] h-[18px] mb-0.5 ${active ? "" : "opacity-80 group-hover:opacity-100"}`} />
                      <span
                        className="text-[10px] uppercase tracking-wider font-bold leading-none"
                        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                      >
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </nav>
          )}

          <div className="flex items-center gap-1 shrink-0">
            {user && <NotificationBell />}
            {user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
                className="text-zinc-400 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        {title && <h1 className="text-3xl mb-6">{title}</h1>}
        {children}
      </main>
    </div>
  );
}
