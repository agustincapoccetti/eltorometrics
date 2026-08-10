import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { Protected } from "@/lib/protected";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { FileText, Trash2, Plus } from "lucide-react";

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export const Route = createFileRoute("/atleta/gym")({
  component: () => <Protected requireRole="atleta"><Page /></Protected>,
});

function Page() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [routines, setRoutines] = useState<any[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  async function load() {
    if (!user) return;
    const { data: p } = await supabase.from("profiles").select("position").eq("id", user.id).single();
    setProfile(p);
    const { data } = await supabase.from("gym_routines").select("*").order("year",{ascending:false}).order("month",{ascending:false});
    const filt = (data ?? []).filter((r) => !r.position || r.position === p?.position);
    setRoutines(filt);
  }
  useEffect(() => { load(); }, [user]);

  async function openPdf(path: string) {
    // Open the tab synchronously so mobile browsers don't block it after the await.
    const win = window.open("", "_blank");
    const { data, error } = await supabase.storage.from("gym-pdfs").createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) {
      win?.close();
      toast.error("No se pudo abrir el PDF");
      return;
    }
    if (win) win.location.href = data.signedUrl;
    else window.location.href = data.signedUrl;
  }

  return (
    <Shell title="Gimnasio">
      <p className="text-sm text-muted-foreground mb-6">Tus rutinas mensuales. Anotá peso, repeticiones y la semana en la que completaste cada ejercicio.</p>

      {routines.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay rutinas publicadas para tu posición.</p>}

      <div className="space-y-3">
        {routines.map((r) => (
          <div key={r.id} className="border border-border">
            <div className="p-4 flex items-center gap-3 flex-wrap">
              <FileText className="h-5 w-5"/>
              <div className="flex-1 min-w-[200px]">
                <p className="font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">{MONTHS[r.month-1]} {r.year} · {r.position ?? "Todos"}</p>
                {r.notes && <p className="text-xs mt-1">{r.notes}</p>}
              </div>
              <Button variant="outline" size="sm" onClick={() => openPdf(r.pdf_path)}>Abrir PDF</Button>
              <Button variant="ghost" size="sm" onClick={() => setOpen(open === r.id ? null : r.id)}>
                {open === r.id ? "Cerrar" : "Mis registros"}
              </Button>
            </div>
            {open === r.id && <Observations routineId={r.id} userId={user!.id} />}
          </div>
        ))}
      </div>
    </Shell>
  );
}

function Observations({ routineId, userId }: { routineId: string; userId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [exercise, setExercise] = useState("");
  const [week, setWeek] = useState("1");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [notes, setNotes] = useState("");

  async function load() {
    const { data } = await supabase.from("gym_observations").select("*").eq("user_id", userId).eq("routine_id", routineId).order("week").order("created_at");
    setItems(data ?? []);
  }
  useEffect(() => { load(); }, [routineId]);

  async function add() {
    if (!exercise.trim()) { toast.error("Ejercicio requerido"); return; }
    const { error } = await supabase.from("gym_observations").insert({
      user_id: userId, routine_id: routineId, exercise: exercise.trim(),
      week: parseInt(week), weight: weight ? parseFloat(weight) : null, reps: reps ? parseInt(reps) : null,
      notes: notes || null, done: true,
    });
    if (error) { toast.error(error.message); return; }
    setExercise(""); setWeight(""); setReps(""); setNotes("");
    load();
  }

  async function toggle(it: any) {
    await supabase.from("gym_observations").update({ done: !it.done }).eq("id", it.id);
    load();
  }
  async function remove(id: string) {
    await supabase.from("gym_observations").delete().eq("id", id);
    load();
  }

  return (
    <div className="border-t border-border p-4 bg-muted/30">
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 mb-3">
        <div className="col-span-2"><Label className="text-xs">Ejercicio</Label><Input value={exercise} onChange={(e) => setExercise(e.target.value)} placeholder="Sentadilla"/></div>
        <div><Label className="text-xs">Semana</Label><Input type="number" min="1" max="6" value={week} onChange={(e) => setWeek(e.target.value)}/></div>
        <div><Label className="text-xs">Peso (kg)</Label><Input type="number" step="0.5" value={weight} onChange={(e) => setWeight(e.target.value)}/></div>
        <div><Label className="text-xs">Reps</Label><Input type="number" value={reps} onChange={(e) => setReps(e.target.value)}/></div>
        <div className="flex items-end"><Button onClick={add} size="sm" className="w-full"><Plus className="h-4 w-4"/></Button></div>
        <div className="col-span-2 sm:col-span-6"><Textarea rows={1} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas (opcional)"/></div>
      </div>

      <div className="space-y-1">
        {items.length === 0 && <p className="text-xs text-muted-foreground">Sin registros todavía.</p>}
        {items.map((it) => (
          <div key={it.id} className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-2 items-center text-sm border border-border bg-background px-2 py-1.5">
            <Checkbox checked={it.done} onCheckedChange={() => toggle(it)} />
            <span className={it.done ? "" : "opacity-60"}>{it.exercise}</span>
            <span className="text-xs font-display">S{it.week ?? "-"}</span>
            <span className="text-xs">{it.weight ?? "-"}kg</span>
            <span className="text-xs">{it.reps ?? "-"}r</span>
            <Button variant="ghost" size="sm" onClick={() => remove(it.id)}><Trash2 className="h-3 w-3"/></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
