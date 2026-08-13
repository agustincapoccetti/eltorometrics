import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { SubTabs, FISIO_TABS } from "@/components/SubTabs";
import { Protected } from "@/lib/protected";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { ChevronRight } from "lucide-react";

export const Route = createFileRoute("/coach/recuperacion")({
  component: () => <Protected requireRole="coach"><CoachRecovery /></Protected>,
});

function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(0,0,0,0); return d.toISOString().slice(0, 10); }

function scoreClass(pct: number) {
  if (pct >= 75) return "text-foreground font-bold";
  if (pct >= 50) return "text-foreground";
  if (pct >= 25) return "text-muted-foreground";
  return "text-muted-foreground italic";
}

function CoachRecovery() {
  const [days, setDays] = useState(7);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "atleta");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) { setRows([]); setLoading(false); return; }
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, last_name, position, photo_url").in("id", ids);
      const since = daysAgo(days);
      const { data: entries } = await supabase.from("recovery_entries").select("user_id, entry_date, total_score, max_score").in("user_id", ids).gte("entry_date", since);

      const map: Record<string, { total: number; max: number; count: number }> = {};
      (entries ?? []).forEach((e) => {
        const x = (map[e.user_id] ??= { total: 0, max: 0, count: 0 });
        x.total += e.total_score; x.max += e.max_score; x.count += 1;
      });

      const rs = (profiles ?? []).map((p) => {
        const m = map[p.id] ?? { total: 0, max: 0, count: 0 };
        const pct = m.max > 0 ? Math.round((m.total / m.max) * 100) : null;
        return {
          id: p.id,
          name: `${p.full_name}${p.last_name ? " " + p.last_name : ""}`,
          position: p.position ?? "Sin puesto",
          photo_url: p.photo_url,
          count: m.count,
          total: m.total,
          max: m.max,
          pct,
        };
      }).sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));

      setRows(rs);
      setLoading(false);
    })();
  }, [days]);

  const byPosition = useMemo(() => {
    const map: Record<string, { position: string; total: number; max: number; n: number }> = {};
    rows.forEach((r) => {
      if (r.pct == null) return;
      const e = (map[r.position] ??= { position: r.position, total: 0, max: 0, n: 0 });
      e.total += r.total; e.max += r.max; e.n += 1;
    });
    return Object.values(map).map((e) => ({
      position: e.position,
      recuperacion: e.max ? Math.round((e.total / e.max) * 100) : 0,
      atletas: e.n,
    })).sort((a, b) => b.recuperacion - a.recuperacion);
  }, [rows]);

  return (
    <Shell title="Recuperación">
      <SubTabs tabs={FISIO_TABS} />
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Período</p>
        {[7, 14, 30].map((d) => (
          <button key={d} onClick={() => setDays(d)} className={`px-3 py-1 text-xs border ${days === d ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>
            {d} días
          </button>
        ))}
      </div>

      <div className="border border-border p-6 mb-6">
        <h2 className="text-xl mb-1">Recuperación por puesto</h2>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Promedio del score (%)</p>
        {byPosition.length === 0 ? <p className="text-sm text-muted-foreground">Sin datos.</p> : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byPosition} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
              <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
              <XAxis dataKey="position" stroke="#000" fontSize={11} />
              <YAxis stroke="#000" fontSize={11} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #000", borderRadius: 0 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="recuperacion" name="Recuperación %" fill="#000" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="border border-border">
        <div className="grid grid-cols-[44px_1.6fr_0.9fr_0.7fr_0.7fr_24px] gap-2 px-4 py-3 border-b border-border text-xs uppercase tracking-wider bg-secondary">
          <div></div><div>Atleta</div><div>Puesto</div><div className="text-center">Días</div><div className="text-center">Score</div><div></div>
        </div>
        {loading ? <p className="p-6 text-sm text-muted-foreground">Cargando...</p> :
          rows.length === 0 ? <p className="p-6 text-sm text-muted-foreground">Sin atletas.</p> :
          rows.map((r) => (
            <Link key={r.id} to="/coach/atleta/$id" params={{ id: r.id }} className="grid grid-cols-[44px_1.6fr_0.9fr_0.7fr_0.7fr_24px] gap-2 px-4 py-3 border-b border-border last:border-b-0 hover:bg-accent items-center">
              <div className="w-9 h-9 border border-border bg-secondary overflow-hidden">
                {r.photo_url ? <img src={r.photo_url} alt={r.name} className="w-full h-full object-cover" /> : null}
              </div>
              <div className="text-sm font-medium">{r.name}</div>
              <div className="text-xs text-muted-foreground">{r.position}</div>
              <div className="text-center text-sm">{r.count}</div>
              <div className={`text-center text-sm ${r.pct != null ? scoreClass(r.pct) : "text-muted-foreground"}`}>
                {r.pct != null ? `${r.pct}%` : "—"}
              </div>
              <div className="flex justify-end"><ChevronRight className="h-4 w-4 text-muted-foreground" /></div>
            </Link>
          ))
        }
      </div>
    </Shell>
  );
}
