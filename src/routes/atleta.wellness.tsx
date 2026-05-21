import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shell } from "@/components/Shell";
import { Protected } from "@/lib/protected";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/atleta/wellness")({ component: () => <Protected requireRole="atleta"><WellnessForm /></Protected> });

const Q = [
  { key: "sleep", label: "Calidad del sueño", min: "Excelente", max: "Muy mala" },
  { key: "stress", label: "Nivel de estrés", min: "Muy bajo", max: "Muy alto" },
  { key: "fatigue", label: "Fatiga muscular", min: "Fresco", max: "Muy fatigado" },
  { key: "mood", label: "Ánimo", min: "Excelente", max: "Muy malo" },
] as const;

function WellnessForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [v, setV] = useState<Record<string, number>>({ sleep: 0, stress: 0, fatigue: 0, mood: 0 });
  const [hasPain, setHasPain] = useState(false);
  const [pain, setPain] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (Q.some((q) => !v[q.key])) { toast.error("Completá todas las preguntas"); return; }
    if (hasPain && !pain.trim()) { toast.error("Describí la molestia"); return; }
    setSaving(true);
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("wellness_entries").upsert({
      user_id: user!.id,
      entry_date: today,
      sleep: v.sleep, stress: v.stress, fatigue: v.fatigue, mood: v.mood,
      has_pain: hasPain, pain_description: hasPain ? pain : null,
    }, { onConflict: "user_id,entry_date" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Bienestar registrado");
    navigate({ to: "/atleta" });
  }

  return (
    <Shell title="Bienestar">
      <p className="text-sm text-muted-foreground mb-6">Cuestionario matutino · escala 1 a 5</p>

      <div className="space-y-6">
        {Q.map((q) => (
          <div key={q.key} className="border border-border p-5">
            <h3 className="text-lg mb-1">{q.label}</h3>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">1 {q.min} · 5 {q.max}</p>
            <div className="grid grid-cols-5 gap-2">
              {[1,2,3,4,5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setV({ ...v, [q.key]: n })}
                  className={`aspect-square flex items-center justify-center border text-xl font-display transition ${
                    v[q.key] === n ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"
                  }`}
                >{n}</button>
              ))}
            </div>
          </div>
        ))}

        <div className="border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg">Dolor / lesión</h3>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">¿Tenés alguna molestia?</p>
            </div>
            <Switch checked={hasPain} onCheckedChange={setHasPain} />
          </div>
          {hasPain && (
            <div>
              <Label htmlFor="pain">Ubicación y descripción</Label>
              <Textarea id="pain" value={pain} onChange={(e) => setPain(e.target.value)} placeholder="Ej: Rodilla derecha, dolor al correr" />
            </div>
          )}
        </div>
      </div>

      <Button onClick={submit} disabled={saving} className="w-full mt-6" size="lg">{saving ? "..." : "Enviar"}</Button>
    </Shell>
  );
}
