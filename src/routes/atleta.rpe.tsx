import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Shell } from "@/components/Shell";
import { Protected } from "@/lib/protected";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, Lock } from "lucide-react";
import { WeekStrip } from "@/components/WeekStrip";
import { isCurrentWeek, startOfWeek, isoDate } from "@/lib/week-utils";
import { rpeColor } from "@/lib/score-colors";

export const Route = createFileRoute("/atleta/rpe")({ component: () => <Protected requireRole="atleta"><RpeForm /></Protected> });

const LABELS: Record<number, string> = {
  0: "Reposo", 1: "Muy fácil", 2: "Fácil", 3: "Moderado", 4: "Algo duro",
  5: "Duro", 6: "Duro+", 7: "Muy duro", 8: "Muy duro+", 9: "Extremo", 10: "Máximo",
};

function RpeForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [score, setScore] = useState<number | null>(null);
  const [date, setDate] = useState(isoDate(new Date()));
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recent, setRecent] = useState<any[]>([]);

  async function loadRecent() {
    if (!user) return;
    const prev = new Date(); prev.setDate(prev.getDate() - 14);
    const { data } = await supabase.from("rpe_entries").select("*").eq("user_id", user.id).gte("session_date", isoDate(prev)).order("session_date", { ascending: false });
    setRecent(data ?? []);
  }
  useEffect(() => { loadRecent(); }, [user]);

  // Sync form with date selection (load existing entry for that date)
  useEffect(() => {
    const e = recent.find((x) => x.session_date === date);
    if (e) { setEditingId(e.id); setScore(e.rpe_score); setLabel(e.session_label ?? ""); }
    else { setEditingId(null); setScore(null); setLabel(""); }
  }, [date, recent]);

  const completed = useMemo(() => new Set(recent.map((r) => r.session_date)), [recent]);
  const prev = (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d; })();
  const prevWeekCompleted = useMemo(() => {
    const start = isoDate(startOfWeek(prev));
    const end = (() => { const e = new Date(startOfWeek(prev)); e.setDate(e.getDate() + 6); return isoDate(e); })();
    return new Set(recent.filter((r) => r.session_date >= start && r.session_date <= end).map((r) => r.session_date));
  }, [recent]);

  const editable = isCurrentWeek(date);

  async function submit() {
    if (!editable) { toast.error("Solo podés editar la semana actual"); return; }
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
    loadRecent();
  }

  async function removeEntry(id: string, entryDate: string) {
    if (!isCurrentWeek(entryDate)) { toast.error("Solo podés borrar la semana actual"); return; }
    if (!confirm("¿Eliminar este registro?")) return;
    const { error } = await supabase.from("rpe_entries").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Eliminado");
    loadRecent();
  }

  return (
    <Shell title="RPE">
      <p className="text-sm text-muted-foreground mb-4">Escala de Esfuerzo Percibido — post entrenamiento. Al enviarlo, tu presente de ese día queda marcado automáticamente.</p>

      <WeekStrip completed={completed} selected={date} onSelect={setDate} showPreviousWeek previousCompleted={prevWeekCompleted} />

      <div className="border border-border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl">{editingId ? "Editar registro" : "¿Qué tan duro fue hoy?"}</h2>
          {!editable && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" />Solo lectura</span>}
        </div>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
          0 reposo · 3 moderado · 5 duro · 7 muy duro · 10 máximo
        </p>
        <div className="grid grid-cols-4 gap-1 mb-4 text-[9px] uppercase tracking-wide text-center">
          <div className="bg-emerald-500 text-white py-1">0-3 Suave</div>
          <div className="bg-amber-400 text-black py-1">4-6 Moderado</div>
          <div className="bg-orange-500 text-white py-1">7-8 Alto</div>
          <div className="bg-red-600 text-white py-1">9-10 Máximo</div>
        </div>

        <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5 mb-4">
          {Array.from({ length: 11 }).map((_, i) => {
            const c = rpeColor(i);
            const active = score === i;
            return (
              <button key={i} type="button" disabled={!editable} onClick={() => setScore(i)}
                className={`aspect-square flex flex-col items-center justify-center border-2 transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  active ? `${c.bg} ${c.text} border-foreground` : "border-border hover:border-foreground"
                }`}>
                <span className="text-lg font-display leading-none">{i}</span>
              </button>
            );
          })}
        </div>
        {score !== null && (
          <p className="text-center text-sm font-medium uppercase tracking-wider">
            {LABELS[score]} · {rpeColor(score).label}
          </p>
        )}

      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div>
          <Label htmlFor="d">Fecha</Label>
          <Input id="d" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="l">Sesión (opcional)</Label>
          <Input id="l" placeholder="Ej: Scrum, Gimnasio..." value={label} onChange={(e) => setLabel(e.target.value)} disabled={!editable} />
        </div>
      </div>

      <div className="flex gap-2 mb-8">
        <Button onClick={submit} disabled={saving || !editable} className="flex-1" size="lg">{saving ? "..." : editingId ? "Actualizar" : "Enviar"}</Button>
        <Button variant="outline" size="lg" onClick={() => navigate({ to: "/atleta" })}>Volver</Button>
      </div>

      {recent.length > 0 && (
        <>
          <h3 className="text-lg mb-3">Mis registros recientes</h3>
          <div className="border border-border">
            {recent.map((e) => {
              const canEdit = isCurrentWeek(e.session_date);
              return (
                <div key={e.id} className="grid grid-cols-[auto_1fr_auto] gap-3 items-center px-3 py-2 border-b border-border last:border-0">
                  <span className="font-display text-xl w-8 text-center">{e.rpe_score}</span>
                  <button onClick={() => setDate(e.session_date)} className="text-sm text-left">
                    <p>{e.session_date} {!canEdit && <Lock className="inline h-3 w-3 ml-1" />}</p>
                    {e.session_label && <p className="text-xs text-muted-foreground">{e.session_label}</p>}
                  </button>
                  <Button variant="ghost" size="sm" disabled={!canEdit} onClick={() => removeEntry(e.id, e.session_date)}><Trash2 className="h-3.5 w-3.5"/></Button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Shell>
  );
}
