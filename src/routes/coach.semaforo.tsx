import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { Protected } from "@/lib/protected";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RugbyLoader } from "@/components/RugbyLoader";
import { POSITIONS } from "@/lib/positions";
import { classifyReadiness, READINESS_META, type ReadinessLevel } from "@/lib/readiness";
import { startOfWeek, endOfWeek, isoDate } from "@/lib/week-utils";
import { useSort, sortIndicator } from "@/lib/sort";
import { toast } from "sonner";

export const Route = createFileRoute("/coach/semaforo")({
  component: () => <Protected requireRole="coach"><Page /></Protected>,
});

type Row = {
  id: string;
  name: string;
  position: string;
  level: ReadinessLevel;
  reasons: string[];
  weeklyLoad: number;
  acwr: number | null;
  avgFatigue: number | null;
  avgWellness: number | null;
};

function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [positionFilter, setPositionFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState<"all" | ReadinessLevel>("all");

  const weekStart = isoDate(startOfWeek());
  const weekEnd = isoDate(endOfWeek());

  useEffect(() => {
    (async () => {
      setLoading(true);
      const chronicStart = (() => { const d = new Date(); d.setDate(d.getDate() - 27); return isoDate(d); })();
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "atleta");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (!ids.length) { setRows([]); setLoading(false); return; }

      const [{ data: profiles }, { data: rpe }, { data: wellness, error: wErr }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, last_name, position").in("id", ids),
        supabase.from("rpe_entries").select("user_id, session_date, rpe_score").in("user_id", ids).gte("session_date", chronicStart),
        supabase.from("wellness_entries").select("user_id, entry_date, sleep, stress, fatigue, mood, has_pain").in("user_id", ids).gte("entry_date", weekStart).lte("entry_date", weekEnd),
      ]);
      if (wErr) toast.error(wErr.message);

      const out: Row[] = (profiles ?? []).map((p: any) => {
        const myRpe = (rpe ?? []).filter((r: any) => r.user_id === p.id);
        const weekRpe = myRpe.filter((r: any) => r.session_date >= weekStart && r.session_date <= weekEnd);
        const weeklyLoad = weekRpe.reduce((s: number, r: any) => s + r.rpe_score, 0);
        const chronicWeekly = myRpe.reduce((s: number, r: any) => s + r.rpe_score, 0) / 4;
        const acwr = chronicWeekly > 0 ? +(weeklyLoad / chronicWeekly).toFixed(2) : null;

        const myWell = (wellness ?? []).filter((w: any) => w.user_id === p.id);
        const avg = (arr: number[]) => (arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null);
        const avgFatigue = avg(myWell.map((w: any) => w.fatigue));
        const avgWellness = avg(myWell.flatMap((w: any) => [w.fatigue, w.sleep, w.stress, w.mood]));
        const hasPain = myWell.some((w: any) => w.has_pain);

        const { level, reasons } = classifyReadiness({
          weeklyLoad, chronicWeekly, acwr, avgFatigue, avgWellness, hasPain,
          wellnessCount: myWell.length, rpeCount: weekRpe.length,
        });

        return {
          id: p.id,
          name: `${p.last_name ? p.last_name + ", " : ""}${p.full_name}`,
          position: p.position?.trim() || "Sin puesto",
          level, reasons, weeklyLoad, acwr, avgFatigue, avgWellness,
        };
      });

      const order: Record<ReadinessLevel, number> = { red: 0, amber: 1, green: 2 };
      setRows(out.sort((a, b) => order[a.level] - order[b.level] || a.name.localeCompare(b.name)));
      setLoading(false);
    })();
  }, [weekStart, weekEnd]);

  const positions = useMemo(
    () => Array.from(new Set([...POSITIONS, ...rows.map((r) => r.position)])).filter(Boolean),
    [rows],
  );

  const visible = rows.filter(
    (r) => (positionFilter === "all" || r.position === positionFilter) && (levelFilter === "all" || r.level === levelFilter),
  );

  const LEVEL_ORDER: Record<ReadinessLevel, number> = { red: 0, amber: 1, green: 2 };
  const { sorted, sort, toggle } = useSort<Row, "level" | "name" | "position" | "load" | "acwr" | "fatigue" | "wellness">(
    visible,
    {
      level: (r) => LEVEL_ORDER[r.level],
      name: (r) => r.name,
      position: (r) => r.position,
      load: (r) => r.weeklyLoad,
      acwr: (r) => r.acwr,
      fatigue: (r) => r.avgFatigue,
      wellness: (r) => r.avgWellness,
    },
    { key: "level", dir: "asc" },
  );

  const SortBtn = ({ k, children }: { k: any; children: React.ReactNode }) => (
    <button onClick={() => toggle(k)} className="inline-flex items-center gap-1">
      {children}<span className="opacity-50 text-[9px]">{sortIndicator(sort.key === k, sort.dir)}</span>
    </button>
  );

  const counts = {
    green: rows.filter((r) => r.level === "green").length,
    amber: rows.filter((r) => r.level === "amber").length,
    red: rows.filter((r) => r.level === "red").length,
  };


  return (
    <Shell title="Semáforo semanal">
      <p className="text-sm text-muted-foreground mb-4">
        Clasificación de la semana en curso ({weekStart} → {weekEnd}) según RPE, carga aguda/crónica (ACWR), fatiga y bienestar.
        Visible solo para coaches.
      </p>

      <div className="grid grid-cols-3 gap-2 mb-5">
        {(["green", "amber", "red"] as ReadinessLevel[]).map((l) => {
          const m = READINESS_META[l];
          return (
            <button
              key={l}
              onClick={() => setLevelFilter(levelFilter === l ? "all" : l)}
              className={`${m.bg} ${m.text} border-2 ${levelFilter === l ? "border-black" : m.border} p-3 text-left`}
            >
              <p className="text-2xl font-display leading-none">{counts[l]}</p>
              <p className="text-[10px] uppercase tracking-wider mt-1 font-semibold">{m.label}</p>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Select value={positionFilter} onValueChange={setPositionFilter}>
          <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los puestos</SelectItem>
            {positions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        {levelFilter !== "all" && (
          <button onClick={() => setLevelFilter("all")} className="text-xs underline">Ver todas las categorías</button>
        )}
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><RugbyLoader /></div>
      ) : (
        <div className="border border-border">
          {visible.length === 0 && <p className="px-4 py-6 text-sm text-muted-foreground">Sin jugadores.</p>}
          {visible.map((r) => {
            const m = READINESS_META[r.level];
            return (
              <div key={r.id} className="flex flex-wrap gap-3 items-start px-3 py-3 border-b border-border last:border-0">
                <span className={`${m.bg} ${m.text} text-[10px] font-semibold uppercase tracking-wider px-2 py-1 shrink-0`}>
                  {m.label}
                </span>
                <div className="flex-1 min-w-[180px]">
                  <Link to="/coach/atleta/$id" params={{ id: r.id }} className="text-sm font-medium hover:underline">
                    {r.name}
                  </Link>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.position}</p>
                  <p className="text-xs text-muted-foreground mt-1">{r.reasons.join(" · ")}</p>
                </div>
                <div className="text-[11px] text-right grid grid-cols-2 gap-x-3 gap-y-0.5 min-w-[150px]">
                  <span className="text-muted-foreground">Carga sem.</span><span className="font-medium">{r.weeklyLoad} UA</span>
                  <span className="text-muted-foreground">ACWR</span><span className="font-medium">{r.acwr ?? "—"}</span>
                  <span className="text-muted-foreground">Fatiga μ</span><span className="font-medium">{r.avgFatigue ?? "—"}</span>
                  <span className="text-muted-foreground">Bienestar μ</span><span className="font-medium">{r.avgWellness ?? "—"}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Shell>
  );
}
