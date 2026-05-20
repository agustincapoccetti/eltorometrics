import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shell } from "@/components/Shell";
import { Protected } from "@/lib/protected";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/atleta/rpe")({ component: () => <Protected requireRole="atleta"><RpeForm /></Protected> });

const LABELS: Record<number, string> = {
  0: "Reposo", 1: "Muy fácil", 2: "Fácil", 3: "Moderado", 4: "Algo duro",
  5: "Duro", 6: "Duro+", 7: "Muy duro", 8: "Muy duro+", 9: "Extremo", 10: "Máximo",
};

function RpeForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [score, setScore] = useState<number | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (score === null) { toast.error("Seleccioná un valor"); return; }
    setSaving(true);
    const { error } = await supabase.from("rpe_entries").insert({
      user_id: user!.id, session_date: date, session_label: label || null, rpe_score: score,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("RPE registrado");
    navigate({ to: "/atleta" });
  }

  return (
    <Shell title="RPE">
      <p className="text-sm text-muted-foreground mb-6">Escala de Esfuerzo Percibido — post entrenamiento</p>

      <div className="border border-border p-6 mb-6">
        <h2 className="text-xl mb-1">¿Qué tan duro fue hoy?</h2>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-6">0 reposo · 5 duro · 10 máximo</p>

        <div className="grid grid-cols-11 gap-1 mb-4">
          {Array.from({ length: 11 }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setScore(i)}
              className={`aspect-square flex items-center justify-center border text-base font-display transition ${
                score === i ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"
              }`}
            >{i}</button>
          ))}
        </div>
        {score !== null && (
          <p className="text-center text-sm font-medium uppercase tracking-wider">{LABELS[score]}</p>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div>
          <Label htmlFor="d">Fecha</Label>
          <Input id="d" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="l">Sesión (opcional)</Label>
          <Input id="l" placeholder="Ej: Scrum, Gimnasio..." value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
      </div>

      <Button onClick={submit} disabled={saving} className="w-full" size="lg">{saving ? "..." : "Enviar"}</Button>
    </Shell>
  );
}
