import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ChevronUp, Dumbbell, History, Loader2, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { groupGymRecords, previousGymRecord, type GymRecord } from "@/lib/gym-records";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export function GymRecords({ routineId, userId }: { routineId: string; userId: string }) {
  const [items, setItems] = useState<GymRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [week, setWeek] = useState(1);
  const [exercise, setExercise] = useState("");
  const [newExercise, setNewExercise] = useState(false);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [notes, setNotes] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  const [editing, setEditing] = useState<GymRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [allWeeks, setAllWeeks] = useState(false);
  const [deleteRecord, setDeleteRecord] = useState<GymRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const formRef = useRef<HTMLFormElement>(null);
  const mutationLock = useRef(false);
  const exerciseGroups = groupGymRecords(items);
  const history = groupGymRecords(items.filter((item) => allWeeks || (item.week ?? 1) === week));
  const previous = previousGymRecord(items, exercise, week, editing?.id);
  const weeks = Array.from({ length: Math.max(5, ...items.map((item) => item.week ?? 1)) }, (_, index) => index + 1);

  async function load() {
    setLoading(true);
    setLoadError(false);
    const { data, error } = await supabase.from("gym_observations").select("*")
      .eq("user_id", userId).eq("routine_id", routineId).order("created_at", { ascending: false });
    if (error) setLoadError(true);
    else setItems(data ?? []);
    setLoading(false);
  }
  useEffect(() => { void load(); }, [routineId, userId]);

  function resetEditor() {
    setEditing(null);
    setWeight(""); setReps(""); setNotes(""); setNotesOpen(false);
  }
  function chooseExercise(name: string) {
    setExercise(name);
    resetEditor();
    setNewExercise(false);
  }
  function edit(item: GymRecord) {
    setEditing(item); setExercise(item.exercise); setNewExercise(false);
    setWeek(item.week ?? 1); setWeight(item.weight?.toString() ?? "");
    setReps(item.reps?.toString() ?? ""); setNotes(item.notes ?? ""); setNotesOpen(Boolean(item.notes));
    formRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (mutationLock.current) return;
    if (!exercise.trim()) { toast.error("Escribe o elige un ejercicio."); return; }
    const parsedWeight = weight === "" ? null : Number(weight);
    const parsedReps = reps === "" ? null : Number(reps);
    if ((parsedWeight !== null && (!Number.isFinite(parsedWeight) || parsedWeight < 0)) ||
        (parsedReps !== null && (!Number.isInteger(parsedReps) || parsedReps < 1))) {
      toast.error("Revisa la carga y las repeticiones."); return;
    }
    mutationLock.current = true;
    setSaving(true);
    try {
      const values = { exercise: exercise.trim(), week, weight: parsedWeight, reps: parsedReps, notes: notes.trim() || null };
      const query = editing
        ? supabase.from("gym_observations").update(values).eq("id", editing.id).eq("user_id", userId).eq("routine_id", routineId)
        : supabase.from("gym_observations").insert({ ...values, user_id: userId, routine_id: routineId, done: true });
      const { data, error } = await query.select().single();
      if (error || !data) { toast.error("No se pudo guardar. Tus datos siguen aquí para volver a intentar."); return; }
      setItems((current) => [data, ...current.filter((item) => item.id !== data.id)]);
      setExercise(data.exercise); setNewExercise(false);
      toast.success(editing ? "Registro actualizado" : `Registro guardado · Semana ${week}`);
      resetEditor();
    } finally { mutationLock.current = false; setSaving(false); }
  }

  async function toggle(item: GymRecord) {
    setBusyIds((ids) => new Set(ids).add(item.id));
    const { data, error } = await supabase.from("gym_observations").update({ done: !item.done })
      .eq("id", item.id).eq("user_id", userId).eq("routine_id", routineId).select().single();
    if (error || !data) toast.error("No se pudo cambiar el estado del registro.");
    else setItems((current) => current.map((record) => record.id === data.id ? data : record));
    setBusyIds((ids) => { const next = new Set(ids); next.delete(item.id); return next; });
  }

  async function remove() {
    if (!deleteRecord || deleting) return;
    setDeleting(true);
    const { data, error } = await supabase.from("gym_observations").delete()
      .eq("id", deleteRecord.id).eq("user_id", userId).eq("routine_id", routineId).select("id");
    if (error || !data?.length) toast.error("No se pudo eliminar el registro.");
    else {
      setItems((current) => current.filter((item) => item.id !== deleteRecord.id));
      if (editing?.id === deleteRecord.id) resetEditor();
      setDeleteRecord(null); toast.success("Registro eliminado");
    }
    setDeleting(false);
  }

  if (loading) return <div className="border-t border-border p-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin motion-reduce:animate-none" />Cargando tus registros…</div>;
  if (loadError) return <div className="border-t border-border p-4 flex flex-wrap items-center gap-3"><p className="text-sm">No se pudieron cargar tus registros.</p><Button variant="outline" onClick={load}>Reintentar</Button></div>;

  return (
    <div className="border-t border-border">
      <div className="p-4 sm:p-5 border-b border-border space-y-3">
        <div className="flex items-center gap-2"><Dumbbell className="size-5" /><h3 className="text-sm">Mis cargas</h3></div>
        <div role="group" aria-label="Semana de la rutina" className="flex gap-2 overflow-x-auto pb-1">
          {weeks.map((number) => <Button key={number} variant={number === week ? "default" : "outline"} className="min-h-11 min-w-14 flex-1 px-3" aria-pressed={number === week} disabled={saving}
            onClick={() => { setWeek(number); resetEditor(); }}>S{number}</Button>)}
        </div>
        <p className="text-xs text-muted-foreground">Semana {week} · {items.filter((item) => (item.week ?? 1) === week).length} registros</p>
      </div>

      <form ref={formRef} onSubmit={save} className="p-4 sm:p-5 space-y-4 bg-muted/30">
        <fieldset disabled={saving} className="space-y-4 min-w-0">
          <div className="space-y-2">
            <Label htmlFor={`exercise-${routineId}`}>Ejercicio</Label>
            {exerciseGroups.length > 0 && !newExercise ? (
              <Select value={exercise} onValueChange={chooseExercise}>
                <SelectTrigger id={`exercise-${routineId}`} className="h-12 bg-background"><SelectValue placeholder="Elegir ejercicio" /></SelectTrigger>
                <SelectContent>{exerciseGroups.map((group) => <SelectItem key={group.name} value={group.name}>{group.name}</SelectItem>)}</SelectContent>
              </Select>
            ) : <Input id={`exercise-${routineId}`} className="h-12 bg-background text-base" value={exercise} onChange={(event) => setExercise(event.target.value)} placeholder="Nombre del ejercicio" required maxLength={150} />}
            {exerciseGroups.length > 0 && <Button type="button" size="sm" variant="ghost" className="min-h-11 px-0" onClick={() => { resetEditor(); setExercise(""); setNewExercise(!newExercise); }}>
              <Plus />{newExercise ? "Elegir uno registrado" : "Nuevo ejercicio"}
            </Button>}
          </div>

          {previous && <div className="border-l-2 border-primary pl-3 text-sm flex items-center gap-2">
            <History className="size-4 shrink-0 text-muted-foreground" />
            <p>Anterior: <strong>{previous.weight ?? "—"} kg × {previous.reps ?? "—"}</strong><span className="text-muted-foreground text-xs ml-2">S{previous.week ?? 1}</span></p>
          </div>}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label htmlFor={`weight-${routineId}`}>Carga (kg)</Label><Input id={`weight-${routineId}`} type="number" inputMode="decimal" step="any" min="0" className="h-16 bg-background text-2xl font-semibold text-center tabular-nums" value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="—" /></div>
            <div className="space-y-2"><Label htmlFor={`reps-${routineId}`}>Repeticiones</Label><Input id={`reps-${routineId}`} type="number" inputMode="numeric" step="1" min="1" className="h-16 bg-background text-2xl font-semibold text-center tabular-nums" value={reps} onChange={(event) => setReps(event.target.value)} placeholder="—" /></div>
          </div>

          <div>
            <Button type="button" variant="ghost" className="px-0 min-h-11" aria-expanded={notesOpen} aria-controls={`notes-${routineId}`} onClick={() => setNotesOpen(!notesOpen)}>{notesOpen ? <ChevronUp /> : <ChevronDown />}Notas {notes ? "· añadidas" : "(opcional)"}</Button>
            {notesOpen && <Textarea id={`notes-${routineId}`} aria-label="Notas del registro" rows={2} className="bg-background text-base" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Sensaciones u observaciones" />}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="h-12 flex-1 min-w-0" disabled={!exercise.trim() || saving}>{saving ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <Save />}{saving ? "Guardando…" : editing ? "Guardar cambios" : "Guardar registro"}</Button>
            {editing && <Button type="button" variant="outline" className="h-12" onClick={resetEditor}>Cancelar</Button>}
          </div>
        </fieldset>
      </form>

      <div className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm">Historial</h3><Button variant="outline" size="sm" className="min-h-11" aria-pressed={allWeeks} onClick={() => setAllWeeks(!allWeeks)}><History />{allWeeks ? `Ver semana ${week}` : "Ver todas las semanas"}</Button></div>
        {history.length === 0 && <div className="py-5 text-center text-muted-foreground"><Dumbbell className="size-7 mx-auto mb-2" /><p className="text-sm">{items.length ? `Sin registros en la semana ${week}.` : "Todavía no has registrado cargas."}</p></div>}
        {history.map((group) => (
          <section key={group.name} className="space-y-2">
            <p className="font-semibold text-sm break-words">{group.name}</p>
            {group.records.map((item) => (
              <div key={item.id} className="border border-border rounded-md p-3 space-y-2 bg-background">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className={item.done ? "" : "opacity-60"}><p className="font-semibold text-lg tabular-nums">{item.weight ?? "—"} <span className="text-xs font-normal text-muted-foreground">kg</span> × {item.reps ?? "—"} <span className="text-xs font-normal text-muted-foreground">reps</span></p><p className="text-xs text-muted-foreground">Semana {item.week ?? 1} · {new Date(item.created_at).toLocaleDateString("es", { day: "2-digit", month: "2-digit" })}</p></div>
                  <div className="flex items-center gap-1">
                    <label className="min-h-11 min-w-11 flex items-center justify-center cursor-pointer" title="Completado"><Checkbox checked={item.done} disabled={busyIds.has(item.id)} aria-label={`Completado: ${item.exercise}, semana ${item.week ?? 1}`} onCheckedChange={() => toggle(item)} /></label>
                    <Button size="icon" variant="ghost" className="size-11" aria-label={`Editar ${item.exercise}`} title="Editar registro" disabled={saving} onClick={() => edit(item)}><Pencil /></Button>
                    <Button size="icon" variant="ghost" className="size-11" aria-label={`Eliminar ${item.exercise}`} title="Eliminar registro" onClick={() => setDeleteRecord(item)}><Trash2 /></Button>
                  </div>
                </div>
                {item.notes && <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{item.notes}</p>}
                {editing?.id === item.id && <p className="text-xs flex items-center gap-1"><Pencil className="size-3" />Editando</p>}
              </div>
            ))}
          </section>
        ))}
      </div>
      <Dialog open={Boolean(deleteRecord)} onOpenChange={(value) => { if (!value && !deleting) setDeleteRecord(null); }}>
        <DialogContent><DialogHeader><DialogTitle>¿Eliminar este registro?</DialogTitle><DialogDescription>{deleteRecord?.exercise} · Semana {deleteRecord?.week ?? 1}. Esta acción no se puede deshacer.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" disabled={deleting} onClick={() => setDeleteRecord(null)}>Cancelar</Button><Button disabled={deleting} onClick={remove}><Trash2 />{deleting ? "Eliminando…" : "Eliminar registro"}</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}