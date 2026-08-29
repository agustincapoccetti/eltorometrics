import { Link } from "@tanstack/react-router";

export type SubTab = { to: string; label: string };

export const HISTORIAL_TABS: SubTab[] = [
  { to: "/atleta/wellness", label: "Bienestar" },
  { to: "/atleta/rpe", label: "RPE" },
  { to: "/atleta/recuperacion", label: "Recuperación" },
  { to: "/atleta/votacion", label: "Votación" },
];

export const ENTRENO_TABS: SubTab[] = [
  { to: "/atleta/gym", label: "Gym" },
  { to: "/atleta/fisio", label: "Fisio" },
  { to: "/atleta/biblioteca", label: "Biblioteca" },
];

// ---- Coach ----
export const PLANTEL_TABS: SubTab[] = [
  { to: "/coach/jugadores", label: "Jugadores" },
  { to: "/coach/cuestionarios", label: "Cuestionarios" },
  { to: "/coach/respuestas", label: "Respuestas" },
  { to: "/coach/votacion", label: "Votación" },
];


export const PLANIFICACION_TABS: SubTab[] = [
  { to: "/coach/gym", label: "Gym" },
  { to: "/coach/calendario", label: "Agenda" },
  { to: "/coach/planificacion", label: "Planific." },
  { to: "/coach/partidos", label: "Partidos" },
  { to: "/coach/evaluaciones", label: "Evaluaciones" },
];


export const FISIO_TABS: SubTab[] = [
  { to: "/coach/fisio", label: "Fisio" },
  { to: "/coach/recuperacion", label: "Recuperación" },
];

export const ADMIN_TABS: SubTab[] = [
  { to: "/coach/usuarios", label: "Usuarios" },
  { to: "/coach/coaches", label: "Cuerpo técnico" },
  { to: "/coach/biblioteca", label: "Biblioteca" },
];

export function SubTabs({ tabs }: { tabs: SubTab[] }) {
  return (
    <nav className="mb-6 flex gap-1 border-2 border-black p-1 bg-white rounded-xl w-full overflow-x-auto no-scrollbar">
      {tabs.map((t) => (
        <Link
          key={t.to}
          to={t.to}
          activeProps={{ className: "bg-black text-white" }}
          inactiveProps={{ className: "text-black hover:bg-black hover:text-white" }}
          className="flex-1 text-center whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold uppercase tracking-wide transition-colors"
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
