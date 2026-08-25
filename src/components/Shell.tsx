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
  TrafficCone,
  ClipboardList,
  ShieldCheck,
  BellRing,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { NotificationBell } from "@/components/NotificationBell";
import { AthleteSearch } from "@/components/AthleteSearch";
import type { ReactNode } from "react";

const ADMIN_EMAIL = "agustincapoccetti@hotmail.com";

type NavItem = { to: string; label: string; icon: LucideIcon };

const ATLETA_NAV: NavItem[] = [
  { to: "/atleta", label: "Hoy", icon: Home },
  { to: "/atleta/wellness", label: "Historial", icon: HeartPulse },
  { to: "/atleta/gym", label: "Fisio y Gym", icon: Dumbbell },
  { to: "/atleta/perfil", label: "Perfil", icon: UserCircle },
];

// Rutas agrupadas dentro de cada ítem del dock (pestañas internas)
const ATLETA_GROUPS: Record<string, string[]> = {
  "/atleta/wellness": ["/atleta/wellness", "/atleta/rpe", "/atleta/recuperacion"],
  "/atleta/gym": ["/atleta/gym", "/atleta/fisio"],
  "/atleta/perfil": ["/atleta/perfil", "/atleta/calendario", "/atleta/biblioteca"],
};


const COACH_NAV: NavItem[] = [
  { to: "/coach", label: "Panel", icon: LayoutDashboard },
  { to: "/coach/jugadores", label: "Plantel", icon: Users },
  { to: "/coach/gym", label: "Planific.", icon: ClipboardList },
  { to: "/coach/fisio", label: "Fisio", icon: Stethoscope },
  { to: "/coach/notificaciones", label: "Avisos", icon: BellRing },
];

// Rutas agrupadas dentro de cada ítem del dock (pestañas internas)
const COACH_GROUPS: Record<string, string[]> = {
  "/coach": ["/coach", "/coach/semaforo"],
  "/coach/jugadores": ["/coach/jugadores", "/coach/cuestionarios", "/coach/atleta"],
  "/coach/gym": ["/coach/gym", "/coach/calendario", "/coach/planificacion", "/coach/partidos", "/coach/evaluaciones"],
  "/coach/fisio": ["/coach/fisio", "/coach/recuperacion"],
};

// Administración: acceso secundario (ícono en la cabecera)
const COACH_ADMIN_ROUTES = ["/coach/usuarios", "/coach/coaches", "/coach/biblioteca"];

function NavDock({
  items,
  isActive,
  variant,
}: {
  items: NavItem[];
  isActive: (to: string) => boolean;
  variant: "top" | "bottom";
}) {
  return (
    <nav
      className={
        variant === "top"
          ? "flex-1 overflow-x-auto no-scrollbar mx-2"
          : "overflow-x-auto no-scrollbar"
      }
      aria-label="Navegación principal"
    >
      <div
        className={
          "flex items-stretch gap-1 w-full bg-white border-2 border-black " +
          (variant === "top" ? "p-1.5 rounded-2xl shadow-sm justify-between" : "p-1 rounded-xl")
        }
      >
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={[
                "group flex flex-col items-center justify-center rounded-lg transition-all duration-150",
                variant === "top"
                  ? "flex-1 min-w-[62px] px-2 py-2.5"
                  : "shrink-0 min-w-[68px] px-2 py-2",
                active ? "bg-black text-white shadow-md" : "text-black hover:bg-black hover:text-white",
              ].join(" ")}
            >
              <Icon className={variant === "top" ? "w-6 h-6 mb-1" : "w-5 h-5 mb-0.5"} />
              <span
                className={
                  (variant === "top" ? "text-[12px]" : "text-[10px]") +
                  " font-semibold leading-none tracking-tight"
                }
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Shell({ children, title }: { children: ReactNode; title?: string }) {
  const { role, roles, setActiveRole, signOut, user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items: NavItem[] =
    role === "atleta" ? ATLETA_NAV : role === "coach" ? COACH_NAV : [];

  const adminHref = isAdmin ? "/coach/usuarios" : "/coach/biblioteca";
  const adminActive = COACH_ADMIN_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));

  const isActive = (to: string) => {
    const group = role === "atleta" ? ATLETA_GROUPS[to] : role === "coach" ? COACH_GROUPS[to] : undefined;
    if (group)
      return group.some((g) =>
        g === "/atleta" || g === "/coach"
          ? pathname === g
          : pathname === g || pathname.startsWith(g + "/"),
      );
    if (to === "/atleta" || to === "/coach") return pathname === to;
    return pathname === to || pathname.startsWith(to + "/");
  };


  const hasNav = items.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="mx-auto max-w-6xl flex items-center justify-between gap-3 px-3 sm:px-4 py-2 sm:py-3">
          <Link to="/" className="shrink-0">
            <Logo size={48} />
          </Link>

          {/* Dock inline solo en pantallas medianas+ */}
          {hasNav && (
            <div className="hidden md:flex flex-1">
              <NavDock items={items} isActive={isActive} variant="top" />
            </div>
          )}

          <div className="flex items-center gap-1 shrink-0">
            {roles.length > 1 && (
              <div className="flex border-2 border-black rounded-lg overflow-hidden" role="group" aria-label="Cambiar vista">
                {(["coach", "atleta"] as const).map((r) =>
                  roles.includes(r) ? (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setActiveRole(r);
                        navigate({ to: r === "coach" ? "/coach" : "/atleta" });
                      }}
                      className={
                        "px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors " +
                        (role === r ? "bg-black text-white" : "bg-white text-black hover:bg-accent")
                      }
                    >
                      {r === "coach" ? "Staff" : "Jugador"}
                    </button>
                  ) : null,
                )}
              </div>
            )}
            {role === "coach" && <AthleteSearch />}

            {role === "coach" && (
              <Link
                to={adminHref}
                aria-label="Administración"
                title="Administración"
                className={
                  "inline-flex items-center justify-center rounded-lg border-2 border-black h-9 w-9 transition-colors " +
                  (adminActive ? "bg-black text-white" : "bg-white text-black hover:bg-black hover:text-white")
                }
              >
                <ShieldCheck className="h-4 w-4" />
              </Link>
            )}
            {user && <NotificationBell />}
            {user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/login" });
                }}
                aria-label="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <main
        className={
          "mx-auto max-w-5xl px-3 sm:px-4 py-6 sm:py-8 " +
          (hasNav ? "pb-24 md:pb-8" : "")
        }
      >
        {title && <h1 className="text-2xl sm:text-3xl mb-4 sm:mb-6">{title}</h1>}
        {children}
      </main>

      {/* Dock fijo abajo solo en móvil */}
      {hasNav && (
        <div
          className="md:hidden fixed left-0 right-0 bottom-0 z-30 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 bg-background transform-gpu"
          style={{ willChange: "transform", backfaceVisibility: "hidden", transform: "translate3d(0,0,0)" }}
        >
          <NavDock items={items} isActive={isActive} variant="bottom" />
        </div>
      )}

    </div>
  );
}
