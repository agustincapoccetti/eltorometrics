import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { SubTabs, PLANTEL_TABS } from "@/components/SubTabs";
import { Protected } from "@/lib/protected";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RugbyLoader } from "@/components/RugbyLoader";
import { POSITIONS } from "@/lib/positions";
import { rpeColor, wellnessColor } from "@/lib/score-colors";
import { isoDate } from "@/lib/week-utils";

export const Route = createFileRoute("/coach/respuestas")({
  component: () => <Protected requireRole="coach"><Page /></Protected>,
  head: () => ({
    meta: [
      { title: "Respuestas de cuestionarios | El Toro Rugby Performance" },
      { name: "description", content: "Compara en una sola pantalla lo que respondió cada jugador en el cuestionario y fecha que elijas." },
      { property: "og:title", content: "Respuestas de cuestionarios | El Toro Rugby" },
      { property: "og:description", content: "Vista comparativa de las respuestas del plantel por cuestionario y fecha." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type FormKind = "wellness" | "rpe" | "recuperacion";

const WELL_COLS = [
  { key: "fatigue", label: "Fatiga" },
  { key: "sleep", label: "Sueño" },
  { key: "stress", label: "Estrés" },
  { key: "mood", label: "Dolor musc." },
] as const;

function Page() {
  const [kind, setKind] = useState<FormKind>("wellness");
  const [date, setDate] = useState(isoDate(new Date()));
  const [positionFilter, setPositionFilter] = useState("all");
  const [athletes, setAthletes] = useState<any[]>([]);
  const [rows, setRows] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "atleta");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (!ids.length) { setAthletes([]); setLoading(false); return; }
      const { data: profs } = await supabase.from("profiles").select("id, full_name, last_name, position").in("id", ids);
      setAthletes((profs ?? []).sort((a: any, b: any) =>
        (a.last_name ?? a.full_name ?? "").localeCompare(b.last_name ?? b.full_name ?? "")));
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!athletes.length) return;
    (async () => {
      setFetching(true);
      const ids = athletes.map((a) => a.id);
      let map: Record<string, any> = {};
      if (kind === "wellness") {
        const { data } = await supabase.from("wellness_entries")
          .select("user_id, sleep, stress, fatigue, mood, has_pain, pain_description")
          .in("user_id", ids).eq("entry_date", date);
        (data ?? []).forEach((r: any) => { map[r.user_id] = r; });
      } else if (kind === "rpe") {
        const { data } = await supabase.from("rpe_entries")
          .select("user_id, rpe_score, session_label")
          .in("user_id", ids).eq("session_date", date);
        (data ?? []).forEach((r: any) => { map[r.user_id] = r; });
      } else {
        const { data } = await supabase.from("recovery_entries")
          .select("user_id, total_score, max_score, notes")
          .in("user_id", ids).eq("entry_date", date);
        (data ?? []).forEach((r: any) => { map[r.user_id] = r; });
      }
      setRows(map);
      setFetching(false);
    })();
  }, [athletes, kind, date]);

  const positions = useMemo(
    () => Array.from(new Set([...POSITIONS, ...athletes.map((a) => a.position?.trim() || "Sin puesto")])),
    [athletes],
  );

  const visible = useMemo(
    () => positionFilter === "all" ? athletes : athletes.filter((a) => (a.position?.trim() || "Sin puesto") === positionFilter),
    [athletes, positionFilter],
  );

  const answered = visible.filter((a) => rows[a.id]).length;

  return (
    <Shell title="Respuestas por cuestionario">
      <SubTabs tabs={PLANTEL_TABS} />
      <p className="text-sm text-muted-foreground mb-5">
        Elige un cuestionario y una fecha para ver en una sola pantalla qué respondió cada jugador.
      </p>

      <div className="border border-border p-4 mb-5 grid gap-3 md:grid-cols-3">
        <div>
          <Label>Cuestionario</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as FormKind)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="wellness">Bienestar</SelectItem>
              <SelectItem value="rpe">RPE de la sesión</SelectItem>
              <SelectItem value="recuperacion">Recuperación</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Puesto</Label>
          <Select value={positionFilter} onValueChange={setPositionFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {positions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="fecha">Fecha</Label>
          <Input id="fecha" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><RugbyLoader /></div>
      ) : (
        <>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            {answered} de {visible.length} respondieron {fetching ? "· actualizando..." : ""}
          </p>
          <div className="border border-border overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-secondary">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold uppercase tracking-wider">Jugador</th>
                  {kind === "wellness" && WELL_COLS.map((c) => (
                    <th key={c.key} className="px-2 py-2 font-semibold uppercase tracking-wider">{c.label}</th>
                  ))}
                  {kind === "wellness" && <th className="text-left px-2 py-2 font-semibold uppercase tracking-wider">Dolor</th>}
                  {kind === "rpe" && <th className="px-2 py-2 font-semibold uppercase tracking-wider">RPE</th>}
                  {kind === "rpe" && <th className="text-left px-2 py-2 font-semibold uppercase tracking-wider">Sesión</th>}
                  {kind === "recuperacion" && <th className="px-2 py-2 font-semibold uppercase tracking-wider">Puntaje</th>}
                  {kind === "recuperacion" && <th className="text-left px-2 py-2 font-semibold uppercase tracking-wider">Notas</th>}
                </tr>
              </thead>
              <tbody>
                {visible.map((a) => {
                  const r = rows[a.id];
                  return (
                    <tr key={a.id} className="border-t border-border">
                      <td className="px-3 py-2">
                        <Link to="/coach/atleta/$id" params={{ id: a.id }} className="hover:underline">
                          {(a.last_name ? a.last_name + ", " : "") + a.full_name}
                        </Link>
                      </td>
                      {!r ? (
                        <td colSpan={kind === "wellness" ? 5 : 2} className="px-2 py-2 text-muted-foreground">Sin respuesta</td>
                      ) : kind === "wellness" ? (
                        <>
                          {WELL_COLS.map((c) => {
                            const v = r[c.key] as number;
                            const col = wellnessColor(v);
                            return (
                              <td key={c.key} className="px-2 py-2 text-center">
                                <span className={`inline-flex h-6 w-6 items-center justify-center font-display ${col.bg} ${col.text}`}>{v}</span>
                              </td>
                            );
                          })}
                          <td className="px-2 py-2">{r.has_pain ? (r.pain_description || "Sí") : "—"}</td>
                        </>
                      ) : kind === "rpe" ? (
                        <>
                          <td className="px-2 py-2 text-center">
                            <span className={`inline-flex h-6 w-6 items-center justify-center font-display ${rpeColor(r.rpe_score).bg} ${rpeColor(r.rpe_score).text}`}>
                              {r.rpe_score}
                            </span>
                          </td>
                          <td className="px-2 py-2">{r.session_label || "—"}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-2 text-center font-display">
                            {r.max_score ? Math.round((r.total_score / r.max_score) * 100) : 0}%
                          </td>
                          <td className="px-2 py-2">{r.notes || "—"}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Shell>
  );
}
