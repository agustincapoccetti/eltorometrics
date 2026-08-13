import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ClipboardList } from "lucide-react";

interface Row {
  id: string;
  value: number;
  notes: string | null;
  evaluation: { id: string; name: string; unit: string; eval_date: string; higher_is_better: boolean } | null;
}

/** Resultados de tests/evaluaciones físicas de un atleta (usado en su perfil y en la ficha del coach). */
export function EvaluationsPanel({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from("evaluation_results")
        .select("id, value, notes, evaluation:evaluations(id, name, unit, eval_date, higher_is_better)")
        .eq("user_id", userId);
      const list = ((data ?? []) as any[]).filter((r) => r.evaluation) as Row[];
      list.sort((a, b) => (a.evaluation!.eval_date).localeCompare(b.evaluation!.eval_date));
      setRows(list);
    })();
  }, [userId]);

  const groups = useMemo(() => {
    const m: Record<string, { name: string; unit: string; higher: boolean; points: { date: string; value: number; notes: string | null }[] }> = {};
    rows.forEach((r) => {
      const e = r.evaluation!;
      const g = (m[e.name] ??= { name: e.name, unit: e.unit, higher: e.higher_is_better, points: [] });
      g.points.push({ date: e.eval_date, value: Number(r.value), notes: r.notes });
    });
    return Object.values(m);
  }, [rows]);

  if (!groups.length) {
    return (
      <div className="border border-border p-6 mb-6">
        <h2 className="text-xl mb-1 flex items-center gap-2"><ClipboardList className="h-4 w-4" />Evaluaciones</h2>
        <p className="text-sm text-muted-foreground">Todavía no hay tests cargados.</p>
      </div>
    );
  }

  return (
    <div className="border border-border p-6 mb-6">
      <h2 className="text-xl mb-4 flex items-center gap-2"><ClipboardList className="h-4 w-4" />Evaluaciones</h2>
      <div className="space-y-6">
        {groups.map((g) => {
          const last = g.points[g.points.length - 1]!;
          const first = g.points[0]!;
          const diff = g.points.length > 1 ? last.value - first.value : null;
          const better = diff == null ? null : g.higher ? diff > 0 : diff < 0;
          return (
            <div key={g.name} className="border border-border p-4">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <h3 className="text-lg">{g.name}</h3>
                <p className="font-display text-2xl">
                  {last.value}
                  <span className="text-xs text-muted-foreground ml-1">{g.unit}</span>
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Último: {last.date}
                {diff != null && (
                  <span className={`ml-2 font-semibold ${better ? "text-emerald-600" : "text-red-600"}`}>
                    {diff > 0 ? "+" : ""}{Math.round(diff * 100) / 100} {g.unit} vs. primer test
                  </span>
                )}
              </p>
              {g.points.length > 1 && (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={g.points}>
                    <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
                    <XAxis dataKey="date" stroke="#000" fontSize={10} />
                    <YAxis stroke="#000" fontSize={10} />
                    <Tooltip contentStyle={{ background: "#fff", border: "1px solid #000", borderRadius: 0 }} />
                    <Line type="monotone" dataKey="value" stroke="#000" strokeWidth={2} dot={{ r: 3, fill: "#000" }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
              <div className="mt-2 text-xs">
                {g.points.map((p, i) => (
                  <p key={i} className="border-b border-border last:border-0 py-1 flex justify-between gap-2">
                    <span className="text-muted-foreground">{p.date}</span>
                    <span className="font-display">{p.value} {g.unit}</span>
                    {p.notes && <span className="italic text-muted-foreground flex-1 text-right">{p.notes}</span>}
                  </p>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
