import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { fmtDate } from "@/lib/format-date";

type Item = { to: string; label: string; value: string; date: string | null };

/**
 * Resumen único del historial del atleta: último registro de cada métrica,
 * visible desde cualquiera de las pestañas de Historial.
 */
export function HistorialStrip() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: w }, { data: r }, { data: rec }] = await Promise.all([
        supabase
          .from("wellness_entries")
          .select("entry_date, sleep, stress, fatigue, mood")
          .eq("user_id", user.id)
          .order("entry_date", { ascending: false })
          .limit(1),
        supabase
          .from("rpe_entries")
          .select("session_date, rpe_score")
          .eq("user_id", user.id)
          .order("session_date", { ascending: false })
          .limit(1),
        supabase
          .from("recovery_entries")
          .select("entry_date, total_score, max_score")
          .eq("user_id", user.id)
          .order("entry_date", { ascending: false })
          .limit(1),
      ]);

      const we = w?.[0];
      const re = r?.[0];
      const ce = rec?.[0];

      setItems([
        {
          to: "/atleta/wellness",
          label: "Bienestar",
          value: we ? `μ ${(((we.sleep + we.stress + we.fatigue + we.mood) / 4)).toFixed(1)}` : "—",
          date: we?.entry_date ?? null,
        },
        {
          to: "/atleta/rpe",
          label: "RPE",
          value: re ? String(re.rpe_score) : "—",
          date: re?.session_date ?? null,
        },
        {
          to: "/atleta/recuperacion",
          label: "Recuperación",
          value: ce && ce.max_score ? `${Math.round((ce.total_score / ce.max_score) * 100)}%` : "—",
          date: ce?.entry_date ?? null,
        },
      ]);
    })();
  }, [user]);

  if (!items.length) return null;

  return (
    <div className="grid grid-cols-3 gap-2 mb-6">
      {items.map((i) => (
        <Link
          key={i.to}
          to={i.to}
          className="border border-border px-2 py-2 text-center hover:bg-accent transition"
        >
          <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground truncate">
            {i.label}
          </p>
          <p className="text-lg sm:text-xl font-medium leading-tight">{i.value}</p>
          <p className="text-[10px] text-muted-foreground">{i.date ? fmtDate(i.date) : "sin datos"}</p>
        </Link>
      ))}
    </div>
  );
}
