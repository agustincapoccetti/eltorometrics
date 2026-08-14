import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

type Athlete = { id: string; full_name: string; last_name: string | null; position: string | null };

const SHORTCUTS: { label: string; to: string }[] = [
  { label: "Panel", to: "/coach" },
  { label: "Lista de jugadores", to: "/coach/jugadores" },
  { label: "Calendario", to: "/coach/calendario" },
  { label: "Fisio", to: "/coach/fisio" },
  { label: "Evaluaciones", to: "/coach/evaluaciones" },
  { label: "Partidos", to: "/coach/partidos" },
  { label: "Biblioteca", to: "/coach/biblioteca" },
];

/** Buscador global del coach: salta directo a la ficha del jugador (⌘K / Ctrl+K). */
export function AthleteSearch() {
  const [open, setOpen] = useState(false);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open || athletes.length) return;
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "atleta");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (!ids.length) return;
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, last_name, position")
        .in("id", ids);
      const sorted = (data ?? []).sort((a, b) =>
        (a.last_name ?? a.full_name ?? "").localeCompare(b.last_name ?? b.full_name ?? ""),
      );
      setAthletes(sorted as Athlete[]);
    })();
  }, [open, athletes.length]);

  function go(to: string, params?: Record<string, string>) {
    setOpen(false);
    navigate({ to, params } as any);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buscar jugador"
        title="Buscar jugador (⌘K)"
        className="inline-flex items-center justify-center rounded-lg border-2 border-black h-9 w-9 bg-white text-black hover:bg-black hover:text-white transition-colors"
      >
        <Search className="h-4 w-4" />
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar jugador o pantalla…" />
        <CommandList>
          <CommandEmpty>Sin resultados.</CommandEmpty>
          <CommandGroup heading="Jugadores">
            {athletes.map((a) => (
              <CommandItem
                key={a.id}
                value={`${a.last_name ?? ""} ${a.full_name ?? ""} ${a.position ?? ""}`}
                onSelect={() => go("/coach/atleta/$id", { id: a.id })}
              >
                <span className="font-medium">
                  {(a.last_name ? a.last_name + ", " : "") + a.full_name}
                </span>
                {a.position && (
                  <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {a.position}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Ir a">
            {SHORTCUTS.map((s) => (
              <CommandItem key={s.to} value={s.label} onSelect={() => go(s.to)}>
                {s.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
