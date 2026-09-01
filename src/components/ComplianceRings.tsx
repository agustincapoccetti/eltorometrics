import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Gauge } from "@/components/Gauge";
import { isoDate, weekDays, isTodayOrPast } from "@/lib/week-utils";
import { ChevronDown } from "lucide-react";

type Row = {
  id: string;
  name: string;
  initials: string;
  weekDone: number;
  weekExp: number;
  monthDone: number;
  monthExp: number;
};

const GREEN = "#10b981";
const AMBER = "#f59e0b";
const RED = "#dc2626";

function hex(p: number) {
  if (p >= 0.99) return GREEN;
  if (p >= 0.6) return AMBER;
  return RED;
}

function initialsOf(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]!.toUpperCase()).join("");
}

export function ComplianceRings() {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [totals, setTotals] = useState({ done: 0, exp: 0 });

  useEffect(() => {
    (async () => {
      const today = isoDate(new Date());
      const week = weekDays();
      const now = new Date();
      const monthStart = isoDate(new Date(now.getFullYear(), now.getMonth(), 1));

      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "atleta");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (!ids.length) return;

      const [{ data: profiles }, { data: rpe }, { data: wel }, { data: evs }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, last_name").in("id", ids),
        supabase.from("rpe_entries").select("user_id, session_date").in("user_id", ids).gte("session_date", monthStart),
        supabase.from("wellness_entries").select("user_id, entry_date").in("user_id", ids).gte("entry_date", monthStart),
        supabase.from("calendar_events").select("event_date, type").eq("type", "training").gte("event_date", monthStart).lte("event_date", today),
      ]);

      const trainings = (evs ?? []).map((e: any) => e.event_date).filter((d: string) => isTodayOrPast(d));
      const weekTrainings = trainings.filter((d) => d >= week[0] && d <= week[6]);
      // Lunes transcurridos del mes (formulario de bienestar)
      const mondays: string[] = [];
      for (let d = new Date(now.getFullYear(), now.getMonth(), 1); isoDate(d) <= today; d.setDate(d.getDate() + 1)) {
        if (d.getDay() === 1) mondays.push(isoDate(d));
      }
      const weekMondays = mondays.filter((m) => m >= week[0] && m <= week[6]);

      const list: Row[] = (profiles ?? []).map((p: any) => {
        const name = `${p.full_name ?? ""}${p.last_name ? " " + p.last_name : ""}`.trim() || "Sin nombre";
        const myRpe = new Set((rpe ?? []).filter((r: any) => r.user_id === p.id).map((r: any) => r.session_date));
        const myWel = new Set((wel ?? []).filter((w: any) => w.user_id === p.id).map((w: any) => w.entry_date));
        const weekDone = weekTrainings.filter((d) => myRpe.has(d)).length + weekMondays.filter((d) => myWel.has(d)).length;
        const monthDone = trainings.filter((d) => myRpe.has(d)).length + mondays.filter((d) => myWel.has(d)).length;
        return {
          id: p.id,
          name,
          initials: initialsOf(name),
          weekDone,
          weekExp: weekTrainings.length + weekMondays.length,
          monthDone,
          monthExp: trainings.length + mondays.length,
        };
      });

      const ratio = (r: Row) => (r.weekExp ? r.weekDone / r.weekExp : 1);
      list.sort((a, b) => ratio(b) - ratio(a) || a.name.localeCompare(b.name));
      setRows(list);
      setTotals({
        done: list.reduce((s, r) => s + r.monthDone, 0),
        exp: list.reduce((s, r) => s + r.monthExp, 0),
      });
    })();
  }, []);

  if (!rows.length) return null;

  return (
    <section className="border-2 border-black mb-10">
      <div className="flex items-end justify-between gap-3 border-b-2 border-black p-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Cumplimiento del mes</p>
          <p className="font-display text-4xl leading-none">
            {totals.done} <span className="text-lg text-muted-foreground">/ {totals.exp}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">formularios respondidos por el plantel</p>
        </div>
        <Gauge
          value={totals.exp ? totals.done / totals.exp : 0}
          color={hex(totals.exp ? totals.done / totals.exp : 0)}
          label="Total"
          center={`${totals.exp ? Math.round((totals.done / totals.exp) * 100) : 0}%`}
          size={76}
        />
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-accent"
      >
        <span>Revisar cumplimiento · {rows.length}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul className="divide-y divide-border border-t border-border">
          {rows.map((r) => {
            const wp = r.weekExp ? r.weekDone / r.weekExp : 0;
            const mp = r.monthExp ? r.monthDone / r.monthExp : 0;
            return (
              <li key={r.id}>
                <Link
                  to="/coach/atleta/$id"
                  params={{ id: r.id }}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-accent"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-black text-[11px] font-semibold">
                    {r.initials}
                  </span>
                  <span className="flex-1 min-w-0 truncate text-sm">{r.name}</span>
                  <Gauge value={wp} color={hex(wp)} label="Sem." center={`${r.weekDone}`} size={44} />
                  <Gauge value={mp} color={hex(mp)} label="Mes" center={`${r.monthDone}`} size={44} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
