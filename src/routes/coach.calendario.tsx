import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { Protected } from "@/lib/protected";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { MonthCalendar } from "@/components/MonthCalendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { notifyAllAthletes } from "@/lib/notifications";

export const Route = createFileRoute("/coach/calendario")({
  component: () => <Protected requireRole="coach"><CoachCalendar /></Protected>,
});

function CoachCalendar() {
  const { user } = useAuth();
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [events, setEvents] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ name: "", type: "training", event_time: "", duration_minutes: "", description: "" });

  async function load() {
    const start = new Date(month.getFullYear(), month.getMonth(), 1).toISOString().slice(0, 10);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0).toISOString().slice(0, 10);
    const { data } = await supabase.from("calendar_events").select("*").gte("event_date", start).lte("event_date", end).order("event_date");
    setEvents(data ?? []);
  }
  useEffect(() => { load(); }, [month]);

  function openCreate(date: string) {
    setSelectedDate(date);
    setEditing(null);
    setForm({ name: "", type: "training", event_time: "", duration_minutes: "60", description: "" });
  }

  function openEdit(e: any) {
    setSelectedDate(e.event_date);
    setEditing(e);
    setForm({
      name: e.name,
      type: e.type,
      event_time: e.event_time?.slice(0, 5) ?? "",
      duration_minutes: e.duration_minutes?.toString() ?? "",
      description: e.description ?? "",
    });
  }

  async function save() {
    if (!form.name || !selectedDate) { toast.error("Faltan datos"); return; }
    const payload: any = {
      event_date: selectedDate,
      name: form.name,
      type: form.type,
      event_time: form.event_time || null,
      duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
      description: form.description || null,
    };
    if (editing) {
      const { error } = await supabase.from("calendar_events").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("calendar_events").insert({ ...payload, created_by: user!.id });
      if (error) { toast.error(error.message); return; }
      await notifyAllAthletes({
        title: form.type === "match" ? "Nuevo partido en agenda" : "Nuevo entrenamiento",
        body: `${form.name} · ${selectedDate}${form.event_time ? ` ${form.event_time}` : ""}`,
        link: "/atleta/calendario", kind: "info", created_by: user!.id,
      });
    }
    toast.success("Guardado");
    setSelectedDate(null); setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este evento?")) return;
    const { error } = await supabase.from("calendar_events").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Eliminado");
    load();
  }

  const dayEvents = selectedDate ? events.filter((e) => e.event_date === selectedDate) : [];

  return (
    <Shell title="Calendario">
      <p className="text-sm text-muted-foreground mb-6">Tocá un día para crear o editar un entrenamiento o partido.</p>

      <MonthCalendar
        month={month}
        events={events}
        onPrev={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
        onNext={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
        onDayClick={(d) => openCreate(d)}
      />

      <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 border border-primary inline-block" /> Entrenamiento</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-primary inline-block" /> Partido</span>
      </div>

      <Dialog open={!!selectedDate} onOpenChange={(o) => { if (!o) { setSelectedDate(null); setEditing(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedDate && new Date(selectedDate + "T12:00").toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })}</DialogTitle>
          </DialogHeader>

          {dayEvents.length > 0 && !editing && (
            <div className="space-y-2 mb-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Eventos del día</p>
              {dayEvents.map((e) => (
                <div key={e.id} className="border border-border p-3 flex items-center justify-between gap-2">
                  <button onClick={() => openEdit(e)} className="text-left flex-1">
                    <p className="font-display text-xs uppercase tracking-wider">{e.type === "match" ? "Partido" : "Entreno"}</p>
                    <p className="text-sm">{e.name}{e.duration_minutes ? ` · ${e.duration_minutes}'` : ""}</p>
                  </button>
                  <Button variant="ghost" size="icon" onClick={() => remove(e.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{editing ? "Editar" : "Nuevo evento"}</p>
            <div>
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="training">Entrenamiento</SelectItem>
                  <SelectItem value="match">Partido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="n">Nombre</Label>
              <Input id="n" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={form.type === "match" ? "Ej: vs Mallorca RC" : "Ej: Scrum + táctica"} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="t">Hora</Label>
                <Input id="t" type="time" value={form.event_time} onChange={(e) => setForm({ ...form, event_time: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="dur">Duración (min)</Label>
                <Input id="dur" type="number" min={0} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="d">Descripción</Label>
              <Textarea id="d" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
          </div>

          <DialogFooter>
            {editing && <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>}
            <Button onClick={save}>{editing ? "Actualizar" : "Crear"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
