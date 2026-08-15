import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { SubTabs, PLANIFICACION_TABS } from "@/components/SubTabs";
import { Protected } from "@/lib/protected";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { MonthCalendar } from "@/components/MonthCalendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus, FileText } from "lucide-react";
import { fmtDateLong, fmtTime } from "@/lib/format-date";

export const Route = createFileRoute("/coach/planificacion")({
  head: () => ({
    meta: [
      { title: "Planificación semanal · El Toro Rugby Performance" },
      { name: "description", content: "Elige el día y describe el contenido del entrenamiento. Editable por todo el cuerpo técnico." },
      { property: "og:title", content: "Planificación semanal · El Toro Rugby Performance" },
      { property: "og:description", content: "Elige el día y describe el contenido del entrenamiento. Editable por todo el cuerpo técnico." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <Protected requireRole="coach"><CoachPlanning /></Protected>,
});

type Ev = {
  id: string;
  event_date: string;
  event_time: string | null;
  duration_minutes: number | null;
  name: string;
  type: "training" | "match";
  description: string | null;
};

const EMPTY = { name: "", type: "training", event_time: "", duration_minutes: "90", description: "" };

function CoachPlanning() {
  const { user } = useAuth();
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [events, setEvents] = useState<Ev[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editing, setEditing] = useState<Ev | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    const y = month.getFullYear();
    const m = month.getMonth();
    const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const end = `${y}-${String(m + 1).padStart(2, "0")}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, "0")}`;
    const { data } = await supabase
      .from("calendar_events").select("*")
      .gte("event_date", start).lte("event_date", end)
      .order("event_date").order("event_time", { nullsFirst: true });
    setEvents((data ?? []) as Ev[]);
  }
  useEffect(() => { load(); }, [month]);

  function openDay(date: string) {
    setSelectedDate(date);
    setEditing(null);
    setForm(EMPTY);
  }

  function openEdit(e: Ev) {
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
    if (!form.name.trim() || !selectedDate) { toast.error("Falta el nombre de la sesión"); return; }
    setSaving(true);
    const payload = {
      event_date: selectedDate,
      name: form.name.trim(),
      type: form.type,
      event_time: form.event_time || null,
      duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
      description: form.description.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("calendar_events").update(payload).eq("id", editing.id)
      : await supabase.from("calendar_events").insert({ ...payload, created_by: user!.id });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Planificación actualizada" : "Sesión planificada");
    setEditing(null);
    setForm(EMPTY);
    load();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta sesión de la planificación?")) return;
    const { error } = await supabase.from("calendar_events").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Eliminada");
    load();
  }

  const dayEvents = selectedDate ? events.filter((e) => e.event_date === selectedDate) : [];
  const withPlan = events.filter((e) => e.description);

  return (
    <Shell title="Planificación">
      <SubTabs tabs={PLANIFICACION_TABS} />
      <p className="text-sm text-muted-foreground mb-4">
        Toca un día para describir de qué se trata la sesión. Cualquier miembro del cuerpo técnico puede editarla.
      </p>

      <MonthCalendar
        month={month}
        events={events}
        onPrev={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
        onNext={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
        onDayClick={openDay}
        renderDay={(_iso, evs) => (
          <div className="space-y-0.5">
            {evs.slice(0, 3).map((e) => {
              const full = events.find((x) => x.id === e.id);
              return (
                <div
                  key={e.id}
                  className={`text-[10px] truncate px-1 py-0.5 ${e.type === "match" ? "bg-primary text-primary-foreground" : "border border-primary"}`}
                >
                  {full?.description ? "✓ " : ""}{e.name}
                </div>
              );
            })}
            {evs.length > 3 && <div className="text-[10px] text-muted-foreground">+{evs.length - 3}</div>}
          </div>
        )}
      />

      <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 border border-primary inline-block" /> Entrenamiento</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-primary inline-block" /> Partido</span>
        <span>✓ con planificación cargada</span>
      </div>

      <div className="mt-8">
        <h2 className="font-display text-sm uppercase tracking-wider mb-3">Sesiones descritas este mes</h2>
        {withPlan.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay sesiones con descripción en este mes.</p>
        ) : (
          <div className="border border-border divide-y divide-border">
            {withPlan.map((e) => (
              <button key={e.id} onClick={() => openEdit(e)} className="w-full text-left p-3 hover:bg-accent transition-colors">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {fmtDateLong(e.event_date)}{e.event_time ? ` · ${fmtTime(e.event_time)}` : ""}
                </p>
                <p className="text-sm font-medium">{e.name}</p>
                <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-line">{e.description}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selectedDate} onOpenChange={(o) => { if (!o) { setSelectedDate(null); setEditing(null); } }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedDate ? fmtDateLong(selectedDate) : ""}</DialogTitle>
            <DialogDescription>Describe el contenido de la sesión para el resto del cuerpo técnico.</DialogDescription>
          </DialogHeader>

          {dayEvents.length > 0 && !editing && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Sesiones del día</p>
              {dayEvents.map((e) => (
                <div key={e.id} className="border border-border p-3 flex items-start justify-between gap-2">
                  <button onClick={() => openEdit(e)} className="text-left flex-1 min-w-0">
                    <p className="font-display text-xs uppercase tracking-wider">
                      {e.type === "match" ? "Partido" : "Entreno"}{e.event_time ? ` · ${fmtTime(e.event_time)}` : ""}
                    </p>
                    <p className="text-sm">{e.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-line">
                      {e.description || "Sin descripción — toca para planificar"}
                    </p>
                  </button>
                  <Button variant="ghost" size="icon" onClick={() => remove(e.id)} aria-label="Eliminar">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              {editing ? <><FileText className="h-3.5 w-3.5" />Editar sesión</> : <><Plus className="h-3.5 w-3.5" />Nueva sesión</>}
            </p>
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
              <Label htmlFor="pname">Nombre</Label>
              <Input id="pname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Scrum + fase de contacto" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ptime">Hora</Label>
                <Input id="ptime" type="time" value={form.event_time} onChange={(e) => setForm({ ...form, event_time: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="pdur">Duración (min)</Label>
                <Input id="pdur" type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="pdesc">Planificación</Label>
              <Textarea
                id="pdesc"
                rows={6}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={"Bloques de la sesión, objetivos, cargas...\nEj:\n15' activación\n25' scrum\n30' juego reducido"}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            {editing && <Button variant="outline" onClick={() => { setEditing(null); setForm(EMPTY); }}>Cancelar edición</Button>}
            <Button onClick={save} disabled={saving}>{saving ? "Guardando..." : editing ? "Guardar cambios" : "Planificar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
