import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { SubTabs, PLANTEL_TABS } from "@/components/SubTabs";
import { Protected } from "@/lib/protected";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { RugbyLoader } from "@/components/RugbyLoader";
import { POSITIONS } from "@/lib/positions";
import { rpeColor, wellnessColor } from "@/lib/score-colors";
import { isoDate } from "@/lib/week-utils";

export const Route = createFileRoute("/coach/cuestionarios")({
  component: () => <Protected requireRole="coach"><Page /></Protected>,
});

const RPE_LABELS: Record<number, string> = {
  0: "Reposo", 1: "Muy fácil", 2: "Fácil", 3: "Moderado", 4: "Algo duro",
  5: "Duro", 6: "Duro+", 7: "Muy duro", 8: "Muy duro+", 9: "Extremo", 10: "Máximo",
};

const WELL_FIELDS = [
  { key: "fatigue", label: "Fatiga", scale: ["Muy fresco", "Fresco", "Normal", "Cansado", "Muy cansado"] },
  { key: "sleep", label: "Calidad del sueño", scale: ["Muy bien", "Bien", "Normal", "Mal", "Muy mal"] },
  { key: "stress", label: "Estrés", scale: ["Muy relajado", "Relajado", "Normal", "Estresado", "Muy estresado"] },
  { key: "mood", label: "Dolor muscular", scale: ["Sin dolor", "Leve", "Moderado", "Alto", "Muy alto"] },
] as const;


function Page() {
  const [athletes, setAthletes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [positionFilter, setPositionFilter] = useState("all");
  const [athleteId, setAthleteId] = useState("");
  const [date, setDate] = useState(isoDate(new Date()));

  const [rpeScore, setRpeScore] = useState<number | null>(null);
  const [sessionLabel, setSessionLabel] = useState("");
  const [rpeId, setRpeId] = useState<string | null>(null);

  const [well, setWell] = useState<Record<string, number>>({ fatigue: 3, sleep: 3, stress: 3, mood: 3 });
  const [hasPain, setHasPain] = useState(false);
  const [painDesc, setPainDesc] = useState("");
  const [wellExists, setWellExists] = useState(false);
  const [saving, setSaving] = useState(false);

  const [hist, setHist] = useState<{ rpe: any[]; well: any[]; rec: any[]; weight: any[] }>({ rpe: [], well: [], rec: [], weight: [] });
  const [histLoading, setHistLoading] = useState(false);

  async function loadHistory(uid: string) {
    if (!uid) { setHist({ rpe: [], well: [], rec: [], weight: [] }); return; }
    setHistLoading(true);
    const [r, w, rc, wh] = await Promise.all([
      supabase.from("rpe_entries").select("id, session_date, session_label, rpe_score").eq("user_id", uid).order("session_date", { ascending: false }).limit(40),
      supabase.from("wellness_entries").select("id, entry_date, sleep, stress, fatigue, mood, has_pain").eq("user_id", uid).order("entry_date", { ascending: false }).limit(40),
      supabase.from("recovery_entries").select("id, entry_date, total_score, max_score").eq("user_id", uid).order("entry_date", { ascending: false }).limit(40),
      supabase.from("weight_history").select("id, weight, recorded_at").eq("user_id", uid).order("recorded_at", { ascending: false }).limit(40),
    ]);
    setHist({ rpe: r.data ?? [], well: w.data ?? [], rec: rc.data ?? [], weight: wh.data ?? [] });
    setHistLoading(false);
  }

  async function removeEntry(kind: "rpe" | "well" | "rec" | "weight", row: any) {
    if (!confirm("¿Borrar este registro? Esta acción no se puede deshacer.")) return;
    if (kind === "rpe") {
      const { error } = await supabase.from("rpe_entries").delete().eq("id", row.id);
      if (error) { toast.error(error.message); return; }
      await supabase.from("attendance").delete().eq("user_id", athleteId).eq("attendance_date", row.session_date).eq("source", "rpe");
      if (row.session_date === date) { setRpeId(null); setRpeScore(null); setSessionLabel(""); }
    } else if (kind === "well") {
      const { error } = await supabase.from("wellness_entries").delete().eq("id", row.id);
      if (error) { toast.error(error.message); return; }
      if (row.entry_date === date) setWellExists(false);
    } else if (kind === "rec") {
      await supabase.from("recovery_entry_items").delete().eq("entry_id", row.id);
      const { error } = await supabase.from("recovery_entries").delete().eq("id", row.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("weight_history").delete().eq("id", row.id);
      if (error) { toast.error(error.message); return; }
    }
    toast.success("Registro borrado");
    loadHistory(athleteId);
  }


  useEffect(() => {
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "atleta");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (!ids.length) { setAthletes([]); setLoading(false); return; }
      const { data: profs } = await supabase.from("profiles").select("id, full_name, last_name, position").in("id", ids);
      const sorted = (profs ?? []).sort((a: any, b: any) =>
        (a.last_name ?? a.full_name ?? "").localeCompare(b.last_name ?? b.full_name ?? ""));
      setAthletes(sorted);
      setLoading(false);
    })();
  }, []);

  const visible = useMemo(
    () => positionFilter === "all" ? athletes : athletes.filter((a) => (a.position?.trim() || "Sin puesto") === positionFilter),
    [athletes, positionFilter],
  );

  const positions = useMemo(
    () => Array.from(new Set([...POSITIONS, ...athletes.map((a) => a.position?.trim() || "Sin puesto")])),
    [athletes],
  );

  // Load existing entries for the selected athlete/date
  useEffect(() => {
    if (!athleteId) return;
    (async () => {
      const { data: r } = await supabase.from("rpe_entries").select("*").eq("user_id", athleteId).eq("session_date", date).maybeSingle();
      setRpeId(r?.id ?? null);
      setRpeScore(r ? r.rpe_score : null);
      setSessionLabel(r?.session_label ?? "");

      const { data: w } = await supabase.from("wellness_entries").select("*").eq("user_id", athleteId).eq("entry_date", date).maybeSingle();
      setWellExists(!!w);
      setWell({
        fatigue: w?.fatigue ?? 3, sleep: w?.sleep ?? 3, stress: w?.stress ?? 3, mood: w?.mood ?? 3,
      });
      setHasPain(!!w?.has_pain);
      setPainDesc(w?.pain_description ?? "");
    })();
  }, [athleteId, date]);

  useEffect(() => { loadHistory(athleteId); /* eslint-disable-next-line */ }, [athleteId]);


  async function saveRpe() {
    if (!athleteId) { toast.error("Selecciona un jugador"); return; }
    if (rpeScore === null) { toast.error("Selecciona un valor de RPE"); return; }
    setSaving(true);
    const payload = { user_id: athleteId, session_date: date, session_label: sessionLabel || null, rpe_score: rpeScore };
    const { error } = rpeId
      ? await supabase.from("rpe_entries").update(payload).eq("id", rpeId)
      : await supabase.from("rpe_entries").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(rpeId ? "RPE actualizado" : "RPE registrado");
    const { data } = await supabase.from("rpe_entries").select("id").eq("user_id", athleteId).eq("session_date", date).maybeSingle();
    setRpeId(data?.id ?? null);
  }

  async function saveWellness() {
    if (!athleteId) { toast.error("Selecciona un jugador"); return; }
    setSaving(true);
    const { error } = await supabase.from("wellness_entries").upsert({
      user_id: athleteId,
      entry_date: date,
      sleep: well.sleep, stress: well.stress, fatigue: well.fatigue, mood: well.mood,
      has_pain: hasPain,
      pain_description: hasPain ? (painDesc || null) : null,
    }, { onConflict: "user_id,entry_date" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setWellExists(true);
    toast.success("Bienestar guardado");
  }

  return (
    <Shell title="Cargar cuestionarios">
      <SubTabs tabs={PLANTEL_TABS} />
      <p className="text-sm text-muted-foreground mb-5">
        Registra o corrige el RPE y el cuestionario de bienestar de cualquier jugador cuando no lo haya completado.
      </p>

      {loading ? (
        <div className="py-12 flex justify-center"><RugbyLoader /></div>
      ) : (
        <>
          <div className="border border-border p-4 mb-6 grid gap-3 md:grid-cols-[180px_1fr_170px]">
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
              <Label>Jugador</Label>
              <Select value={athleteId} onValueChange={setAthleteId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar jugador" /></SelectTrigger>
                <SelectContent>
                  {visible.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {(a.last_name ? a.last_name + ", " : "") + a.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="d">Fecha</Label>
              <Input id="d" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="border border-border p-5 mb-6">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <h2 className="text-sm uppercase tracking-wider font-semibold">RPE de la sesión</h2>
              {rpeId && <span className="text-xs px-2 py-1 border border-border">Ya existía · se actualizará</span>}
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5 mb-3">
              {Array.from({ length: 11 }, (_, i) => i).map((n) => {
                const c = rpeColor(n);
                const active = rpeScore === n;
                return (
                  <button
                    key={n}
                    onClick={() => setRpeScore(n)}
                    className={`aspect-square border-2 flex items-center justify-center font-display text-lg ${active ? `${c.bg} ${c.text} border-black` : "border-border hover:border-black"}`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            {rpeScore !== null && (
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">{RPE_LABELS[rpeScore]}</p>
            )}
            <div className="flex gap-2 items-end flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="sl">Sesión (opcional)</Label>
                <Input id="sl" value={sessionLabel} onChange={(e) => setSessionLabel(e.target.value)} placeholder="Gym, campo, partido..." />
              </div>
              <Button onClick={saveRpe} disabled={saving}>Guardar RPE</Button>
            </div>
          </div>

          <div className="border border-border p-5">
            <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
              <h2 className="text-sm uppercase tracking-wider font-semibold">Bienestar</h2>
              {wellExists && <span className="text-xs px-2 py-1 border border-border">Ya existía · se actualizará</span>}
            </div>
            <div className="space-y-4">
              {WELL_FIELDS.map((f) => (
                <div key={f.key}>
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <Label>{f.label}</Label>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      1 {f.scale[0]} · 5 {f.scale[4]}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[1, 2, 3, 4, 5].map((n) => {
                      const c = wellnessColor(n);
                      const active = well[f.key] === n;
                      return (
                        <button
                          key={n}
                          onClick={() => setWell((w) => ({ ...w, [f.key]: n }))}
                          className={`py-2 border-2 flex flex-col items-center gap-0.5 min-h-[58px] justify-center ${active ? `${c.bg} ${c.text} border-black` : "border-border hover:border-black"}`}
                        >
                          <span className="font-display leading-none">{n}</span>
                          <span className="text-[8px] uppercase leading-tight text-center px-0.5">{f.scale[n - 1]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={hasPain} onCheckedChange={(v) => setHasPain(v === true)} />
                <span>Reporta dolor o molestia</span>
              </label>
              {hasPain && (
                <Textarea value={painDesc} onChange={(e) => setPainDesc(e.target.value)} placeholder="Zona y descripción del dolor" />
              )}
              <Button onClick={saveWellness} disabled={saving} className="w-full sm:w-auto">Guardar bienestar</Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">Escala 1 = mejor · 5 = peor.</p>
          </div>
        </>
      )}
    </Shell>
  );
}
