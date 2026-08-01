import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Shell } from "@/components/Shell";
import { Protected } from "@/lib/protected";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { WeekStrip } from "@/components/WeekStrip";
import { isCurrentWeek, startOfWeek, isoDate } from "@/lib/week-utils";
import { wellnessColor } from "@/lib/score-colors";

export const Route = createFileRoute("/atleta/wellness")({ component: () => <Protected requireRole="atleta"><WellnessForm /></Protected> });

// Scale is always 1 = MUY BUENO (mejor estado) → 5 = MUY MALO (peor estado)
const Q = [
  { key: "sleep", label: "Calidad del sueño", scale: ["Dormí muy bien", "Dormí bien", "Normal", "Dormí mal", "Dormí muy mal"] },
  { key: "stress", label: "Nivel de estrés", scale: ["Muy relajado", "Relajado", "Normal", "Estresado", "Muy estresado"] },
  { key: "fatigue", label: "Fatiga muscular", scale: ["Muy fresco", "Fresco", "Normal", "Cansado", "Muy cansado"] },
  { key: "mood", label: "Dolor muscular", scale: ["Sin dolor", "Molestia leve", "Moderado", "Dolor alto", "Dolor muy alto"] },
] as const;

const GLOBAL_SCALE = ["1 · Muy bueno", "2 · Bueno", "3 · Regular", "4 · Malo", "5 · Muy malo"];


function WellnessForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [v, setV] = useState<Record<string, number>>({ sleep: 0, stress: 0, fatigue: 0, mood: 0 });
  const [hasPain, setHasPain] = useState(false);
  const [pain, setPain] = useState("");
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [entries, setEntries] = useState<any[]>([]);

  async function loadEntries() {
    if (!user) return;
    const start = new Date(); start.setDate(start.getDate() - 14);
    const { data } = await supabase.from("wellness_entries").select("*").eq("user_id", user.id).gte("entry_date", isoDate(start));
    setEntries(data ?? []);
  }
  useEffect(() => { loadEntries(); }, [user]);

  useEffect(() => {
    const data = entries.find((e) => e.entry_date === date);
    if (data) {
      setV({ sleep: data.sleep, stress: data.stress, fatigue: data.fatigue, mood: data.mood });
      setHasPain(data.has_pain); setPain(data.pain_description ?? "");
    } else {
      setV({ sleep: 0, stress: 0, fatigue: 0, mood: 0 }); setHasPain(false); setPain("");
    }
  }, [date, entries]);

  const completed = useMemo(() => new Set(entries.map((e) => e.entry_date)), [entries]);
  const prev = (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d; })();
  const prevCompleted = useMemo(() => {
    const start = isoDate(startOfWeek(prev));
    const end = (() => { const e = new Date(startOfWeek(prev)); e.setDate(e.getDate() + 6); return isoDate(e); })();
    return new Set(entries.filter((e) => e.entry_date >= start && e.entry_date <= end).map((e) => e.entry_date));
  }, [entries]);

  const editable = isCurrentWeek(date);

  async function submit() {
    if (!editable) { toast.error("Solo podés editar la semana actual"); return; }
    if (Q.some((q) => !v[q.key])) { toast.error("Completá todas las preguntas"); return; }
    if (hasPain && !pain.trim()) { toast.error("Describí la molestia"); return; }
    setSaving(true);
    const { error } = await supabase.from("wellness_entries").upsert({
      user_id: user!.id, entry_date: date,
      sleep: v.sleep, stress: v.stress, fatigue: v.fatigue, mood: v.mood,
      has_pain: hasPain, pain_description: hasPain ? pain : null,
    }, { onConflict: "user_id,entry_date" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Bienestar guardado");
    loadEntries();
    navigate({ to: "/atleta" });
  }

  async function removeEntry() {
    if (!editable) { toast.error("Solo podés borrar la semana actual"); return; }
    if (!confirm("¿Eliminar el registro de este día?")) return;
    const { error } = await supabase.from("wellness_entries").delete().eq("user_id", user!.id).eq("entry_date", date);
    if (error) { toast.error(error.message); return; }
    toast.success("Eliminado");
    setV({ sleep: 0, stress: 0, fatigue: 0, mood: 0 }); setHasPain(false); setPain("");
    loadEntries();
  }

  return (
    <Shell title="Bienestar">
      <p className="text-sm text-muted-foreground mb-3">
        Cuestionario matutino · <strong>1 = MUY BUENO</strong> (estás bien) → <strong>5 = MUY MALO</strong> (peor estado)
      </p>
      <div className="grid grid-cols-5 gap-1 mb-4">
        {GLOBAL_SCALE.map((s, i) => {
          const c = wellnessColor(i + 1);
          return (
            <div key={s} className={`${c.bg} ${c.text} text-[9px] sm:text-[10px] uppercase tracking-wide text-center py-1 px-0.5 leading-tight`}>
              {s}
            </div>
          );
        })}
      </div>

      <WeekStrip completed={completed} selected={date} onSelect={setDate} showPreviousWeek previousCompleted={prevCompleted} />

      <div className="border border-border p-4 mb-6 flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1 min-w-[160px]">
          <Label htmlFor="wd">Fecha</Label>
          <Input id="wd" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        {!editable && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" />Solo semana actual</span>}
        <Button variant="outline" size="sm" disabled={!editable} onClick={removeEntry}>Eliminar registro</Button>
      </div>

      <div className="space-y-5">
        {Q.map((q) => (
          <div key={q.key} className="border border-border p-4 sm:p-5">
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <h3 className="text-lg">{q.label}</h3>
              {v[q.key] ? (
                <span className="text-xs uppercase tracking-wider font-semibold">{q.scale[v[q.key] - 1]}</span>
              ) : null}
            </div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">
              1 {q.scale[0]} · 5 {q.scale[4]}
            </p>
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {[1, 2, 3, 4, 5].map((n) => {
                const c = wellnessColor(n);
                const active = v[q.key] === n;
                return (
                  <button
                    key={n} type="button" disabled={!editable}
                    onClick={() => setV({ ...v, [q.key]: n })}
                    className={`flex flex-col items-center justify-center gap-0.5 border-2 py-2 min-h-[64px] transition disabled:opacity-50 disabled:cursor-not-allowed ${
                      active ? `${c.bg} ${c.text} border-foreground` : "border-border hover:border-foreground"
                    }`}
                  >
                    <span className="text-xl font-display leading-none">{n}</span>
                    <span className="text-[8px] sm:text-[9px] uppercase leading-tight text-center px-0.5">{q.scale[n - 1]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}


        <div className="border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg">Dolor / lesión</h3>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">¿Tenés alguna molestia?</p>
            </div>
            <Switch checked={hasPain} onCheckedChange={setHasPain} disabled={!editable} />
          </div>
          {hasPain && (
            <div>
              <Label htmlFor="pain">Ubicación y descripción</Label>
              <Textarea id="pain" value={pain} onChange={(e) => setPain(e.target.value)} placeholder="Ej: Rodilla derecha, dolor al correr" disabled={!editable} />
            </div>
          )}
        </div>
      </div>

      <Button onClick={submit} disabled={saving || !editable} className="w-full mt-6" size="lg">{saving ? "..." : "Enviar"}</Button>
    </Shell>
  );
}
