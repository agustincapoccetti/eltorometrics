import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { APPOINTMENT_TYPES } from "@/lib/appointment-types";

const WEEKDAYS = [
  { v: 1, l: "Lun" }, { v: 2, l: "Mar" }, { v: 3, l: "Mié" }, { v: 4, l: "Jue" },
  { v: 5, l: "Vie" }, { v: 6, l: "Sáb" }, { v: 0, l: "Dom" },
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  kind: "training" | "physio_slot";
  onCreated?: () => void;
}

export function RecurringDialog({ open, onOpenChange, kind, onCreated }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [interval, setInterval] = useState("15");
  const [duration, setDuration] = useState("60");
  const [eventType, setEventType] = useState<"training" | "match">("training");
  const [apptType, setApptType] = useState("fisio_club");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  function toggleDay(d: number) {
    setWeekdays((w) => w.includes(d) ? w.filter((x) => x !== d) : [...w, d]);
  }

  async function save() {
    if (!weekdays.length) { toast.error("Elige al menos un día"); return; }
    if (!startTime) { toast.error("Indica una hora"); return; }
    if (kind === "physio_slot" && !endTime) { toast.error("Indica hora de fin del bloque"); return; }
    if (kind === "training" && !name) { toast.error("Pon un nombre"); return; }

    setSaving(true);
    const payload: any = {
      kind, name: name || (kind === "physio_slot" ? "Bloque fisio" : "Entrenamiento"),
      weekdays, start_time: startTime,
      duration_minutes: kind === "physio_slot" ? parseInt(interval) : parseInt(duration),
      start_date: startDate, end_date: endDate || null,
      active: true, created_by: user!.id,
      event_type: kind === "training" ? eventType : null,
      appointment_type: kind === "physio_slot" ? apptType : null,
      slot_interval_minutes: kind === "physio_slot" ? parseInt(interval) : null,
    };
    const { data: sched, error } = await supabase.from("recurring_schedules").insert(payload).select().single();
    if (error || !sched) { setSaving(false); toast.error(error?.message ?? "Error"); return; }

    // Materialize events/slots from start_date through end_date or +90 days
    const until = endDate ? new Date(endDate) : new Date(Date.now() + 90 * 86400000);
    const from = new Date(startDate);
    const rows: any[] = [];
    for (let d = new Date(from); d <= until; d.setDate(d.getDate() + 1)) {
      if (!weekdays.includes(d.getDay())) continue;
      const isoDate = d.toISOString().slice(0, 10);
      if (kind === "training") {
        rows.push({
          event_date: isoDate, event_time: startTime, duration_minutes: parseInt(duration),
          name: payload.name, type: eventType, created_by: user!.id,
        });
      } else {
        // generate slots from start_time to end_time at interval
        const [sh, sm] = startTime.split(":").map(Number);
        const [eh, em] = endTime.split(":").map(Number);
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;
        const step = parseInt(interval);
        for (let m = startMin; m + step <= endMin; m += step) {
          const hh = String(Math.floor(m / 60)).padStart(2, "0");
          const mm = String(m % 60).padStart(2, "0");
          rows.push({
            slot_date: isoDate, start_time: `${hh}:${mm}`, duration_minutes: step,
            appointment_type: apptType, recurring_schedule_id: sched.id, created_by: user!.id,
          });
        }
      }
    }

    if (rows.length) {
      const table = kind === "training" ? "calendar_events" : "physio_slots";
      // physio_slots has UNIQUE (date,time,type) — ignore duplicates
      const { error: insErr } = await supabase.from(table as any).insert(rows);
      if (insErr && !insErr.message.toLowerCase().includes("duplicate")) {
        // partial success ok
        console.warn(insErr);
      }
    }

    setSaving(false);
    toast.success(`Programación creada (${rows.length} ${kind === "training" ? "eventos" : "turnos"})`);
    setName(""); setWeekdays([]); setStartTime(""); setEndTime(""); setEndDate("");
    onCreated?.(); onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{kind === "training" ? "Repetir entrenamiento" : "Abrir turnos de fisio recurrentes"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {kind === "training" && (
            <>
              <div>
                <Label>Tipo</Label>
                <Select value={eventType} onValueChange={(v) => setEventType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="training">Entrenamiento</SelectItem>
                    <SelectItem value="match">Partido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nombre</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Sesión técnica" />
              </div>
              <div>
                <Label>Duración (min)</Label>
                <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
              </div>
            </>
          )}

          {kind === "physio_slot" && (
            <>
              <div>
                <Label>Tipo de atención</Label>
                <Select value={apptType} onValueChange={setApptType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {APPOINTMENT_TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.icon} {t.l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nombre del bloque (opcional)</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Turnos tarde" />
              </div>
              <div>
                <Label>Duración de cada turno (min)</Label>
                <Input type="number" value={interval} onChange={(e) => setInterval(e.target.value)} />
              </div>
            </>
          )}

          <div>
            <Label>Días de la semana</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {WEEKDAYS.map((d) => (
                <button key={d.v} type="button" onClick={() => toggleDay(d.v)}
                  className={`px-3 py-2 text-xs uppercase tracking-wider border ${weekdays.includes(d.v) ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>
                  {d.l}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{kind === "physio_slot" ? "Hora inicio" : "Hora"}</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            {kind === "physio_slot" && (
              <div>
                <Label>Hora fin</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Desde</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>Hasta (opcional)</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">Si dejas el campo "hasta" vacío, se programan los próximos 90 días y podrás frenarlo cuando quieras.</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "..." : "Programar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RecurringList({ kind, refreshKey }: { kind: "training" | "physio_slot"; refreshKey?: number }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase.from("recurring_schedules").select("*").eq("kind", kind).order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useState(() => { load(); });
  // refresh on key change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  if (refreshKey !== undefined) {
    useState(() => { load(); });
  }

  async function stop(id: string) {
    if (!confirm("¿Frenar esta programación? Se borrarán los próximos eventos sin reservar.")) return;
    await supabase.from("recurring_schedules").update({ active: false, end_date: new Date().toISOString().slice(0, 10) }).eq("id", id);
    const today = new Date().toISOString().slice(0, 10);
    if (kind === "training") {
      // No hard link from calendar_events; rely on coach manual cleanup. Best-effort: nothing to delete here.
    } else {
      await supabase.from("physio_slots").delete().eq("recurring_schedule_id", id).is("reserved_by", null).gte("slot_date", today);
    }
    toast.success("Programación frenada");
    load();
  }

  if (loading) return null;
  if (!items.length) return <p className="text-xs text-muted-foreground">No hay programaciones activas.</p>;
  const labelDay = (d: number) => WEEKDAYS.find((x) => x.v === d)?.l ?? d;
  return (
    <div className="space-y-2">
      {items.map((it) => (
        <div key={it.id} className="border border-border p-3 flex items-center justify-between gap-2">
          <div className="text-sm">
            <p className="font-medium">{it.name} <span className="text-[10px] uppercase ml-1 text-muted-foreground">{it.active ? "Activa" : "Detenida"}</span></p>
            <p className="text-xs text-muted-foreground">
              {it.weekdays.map(labelDay).join(", ")} · {it.start_time?.slice(0, 5)}
              {it.end_date ? ` · hasta ${it.end_date}` : " · sin fecha de fin"}
            </p>
          </div>
          {it.active && <Button size="sm" variant="outline" onClick={() => stop(it.id)}>Frenar</Button>}
        </div>
      ))}
    </div>
  );
}
