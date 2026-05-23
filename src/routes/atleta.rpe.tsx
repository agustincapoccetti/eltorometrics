import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { Protected } from "@/lib/protected";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, Pencil } from "lucide-react";

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recent, setRecent] = useState<any[]>([]);

  async function loadRecent() {
    if (!user) return;
    const { data } = await supabase.from("rpe_entries").select("*").eq("user_id", user.id).order("session_date",{ascending:false}).limit(10);
    setRecent(data ?? []);
  }
  useEffect(() => { loadRecent(); }, [user]);

  async function submit() {
    if (score === null) { toast.error("Seleccioná un valor"); return; }
    setSaving(true);
    if (editingId) {
      const { error } = await supabase.from("rpe_entries").update({
        session_date: date, session_label: label || null, rpe_score: score,
      }).eq("id", editingId);
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success("RPE actualizado");
    } else {
      const { error } = await supabase.from("rpe_entries").insert({
        user_id: user!.id, session_date: date, session_label: label || null, rpe_score: score,
      });
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success("RPE registrado");
    }
    setEditingId(null); setScore(null); setLabel("");
    loadRecent();
  }

  function editEntry(e: any) {
    setEditingId(e.id); setScore(e.rpe_score); setDate(e.session_date); setLabel(e.session_label ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function removeEntry(id: string) {
    if (!confirm("¿Eliminar este registro?")) return;
    const { error } = await supabase.from("rpe_entries").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Eliminado");
    loadRecent();
  }

  return (
    <Shell title="RPE">
      <p className="text-sm text-muted-foreground mb-6">Escala de Esfuerzo Percibido — post entrenamiento</p>

      <div className="border border-border p-6 mb-6">
        <h2 className="text-xl mb-1">{editingId ? "Editar registro" : "¿Qué tan duro fue hoy?"}</h2>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-6">0 reposo · 5 duro · 10 máximo</p>

        <div className="grid grid-cols-11 gap-1 mb-4">
          {Array.from({ length: 11 }).map((_, i) => (
            <button key={i} type="button" onClick={() => setScore(i)}
              className={`aspect-square flex items-center justify-center border text-base font-display transition ${
                score === i ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"
              }`}>{i}</button>
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

      <div className="flex gap-2 mb-8">
        <Button onClick={submit} disabled={saving} className="flex-1" size="lg">{saving ? "..." : editingId ? "Actualizar" : "Enviar"}</Button>
        {editingId && <Button variant="outline" size="lg" onClick={() => { setEditingId(null); setScore(null); setLabel(""); }}>Cancelar</Button>}
        <Button variant="outline" size="lg" onClick={() => navigate({ to: "/atleta" })}>Volver</Button>
      </div>

      {recent.length > 0 && (
        <>
          <h3 className="text-lg mb-3">Mis registros recientes</h3>
          <div className="border border-border">
            {recent.map((e) => (
              <div key={e.id} className="grid grid-cols-[auto_1fr_auto_auto] gap-3 items-center px-3 py-2 border-b border-border last:border-0">
                <span className="font-display text-xl w-8 text-center">{e.rpe_score}</span>
                <div className="text-sm">
                  <p>{e.session_date}</p>
                  {e.session_label && <p className="text-xs text-muted-foreground">{e.session_label}</p>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => editEntry(e)}><Pencil className="h-3.5 w-3.5"/></Button>
                <Button variant="ghost" size="sm" onClick={() => removeEntry(e.id)}><Trash2 className="h-3.5 w-3.5"/></Button>
              </div>
            ))}
          </div>
        </>
      )}
    </Shell>
  );
}
