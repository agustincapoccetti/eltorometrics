import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Shell } from "@/components/Shell";
import { Protected } from "@/lib/protected";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { FileDown, Plus, Trash2, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";
import { exportPdf } from "@/lib/pdf-export";
import { MonthCalendar } from "@/components/MonthCalendar";
import { COMMON_RUGBY_PAINS } from "@/routes/atleta.fisio";
import { createNotifications } from "@/lib/notifications";
import { RecurringDialog, RecurringList } from "@/components/RecurringDialog";


export const Route = createFileRoute("/coach/fisio")({
  component: () => <Protected requireRole="coach"><CoachPhysio /></Protected>,
});

export const APPOINTMENT_TYPES = [
  { v: "fisio_club", l: "Fisio en club", icon: "🏟️" },
  { v: "fisio_externo", l: "Fisio externo", icon: "🏥" },
  { v: "presoterapia", l: "Botas de presoterapia", icon: "🦵" },
] as const;
function typeLabel(v: string) { return APPOINTMENT_TYPES.find((t) => t.v === v)?.l ?? v; }
function typeIcon(v: string) { return APPOINTMENT_TYPES.find((t) => t.v === v)?.icon ?? "•"; }

function CoachPhysio() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [athletes, setAthletes] = useState<any[]>([]);
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const reasonsRef = useRef<HTMLDivElement>(null);
  const athletesRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({
    user_id: "",
    appointment_type: "fisio_club",
    appointment_date: new Date().toISOString().slice(0, 10),
    appointment_time: "",
    reasons: [] as string[],
    notes: "",
    status: "scheduled",
  });

  async function load() {
    const { data: appts } = await supabase.from("physio_appointments").select("*").order("appointment_date", { ascending: false }).order("appointment_time");
    setAppointments(appts ?? []);
    const ids = Array.from(new Set((appts ?? []).map((a) => a.user_id)));
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "atleta");
    const allIds = Array.from(new Set([...(roles ?? []).map((r) => r.user_id), ...ids]));
    if (allIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, last_name, position, photo_url").in("id", allIds);
      const m: Record<string, any> = {};
      (profs ?? []).forEach((p) => { m[p.id] = p; });
      setProfiles(m);
      setAthletes((profs ?? []).filter((p) => (roles ?? []).some((r) => r.user_id === p.id)).sort((a, b) => a.full_name.localeCompare(b.full_name)));
    }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => typeFilter === "all" ? appointments : appointments.filter((a) => a.appointment_type === typeFilter), [appointments, typeFilter]);

  const byAthlete = useMemo(() => {
    const map: Record<string, any> = {};
    filtered.forEach((a) => {
      const p = profiles[a.user_id];
      const name = p ? `${p.full_name}${p.last_name ? " " + p.last_name : ""}` : a.user_id.slice(0, 8);
      const e = (map[a.user_id] ??= { id: a.user_id, name, position: p?.position ?? "—", total: 0, attended: 0, scheduled: 0, cancelled: 0 });
      e.total++;
      if (a.status === "attended") e.attended++;
      else if (a.status === "cancelled") e.cancelled++;
      else e.scheduled++;
    });
    return Object.values(map).sort((a: any, b: any) => b.total - a.total);
  }, [filtered, profiles]);

  const byReason = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((a) => (a.reasons ?? []).forEach((r: string) => { counts[r] = (counts[r] ?? 0) + 1; }));
    return Object.entries(counts).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
  }, [filtered]);

  // Calendar events: one per appointment
  const calEvents = useMemo(() => filtered.map((a) => ({
    id: a.id,
    event_date: a.appointment_date,
    name: `${typeIcon(a.appointment_type)} ${profiles[a.user_id]?.full_name ?? "—"}`,
    type: "training" as const,
  })), [filtered, profiles]);

  const dayAppointments = useMemo(() => {
    if (!selectedDate) return [];
    return filtered.filter((a) => a.appointment_date === selectedDate)
      .sort((a, b) => (a.appointment_time ?? "99:99").localeCompare(b.appointment_time ?? "99:99"));
  }, [filtered, selectedDate]);


  function openNew(date?: string) {
    setEditing(null);
    setForm({
      user_id: "", appointment_type: "fisio_club",
      appointment_date: date ?? new Date().toISOString().slice(0, 10),
      appointment_time: "", reasons: [], notes: "", status: "scheduled",
    });
    setOpen(true);
  }
  function openEdit(a: any) {
    setEditing(a);
    setForm({
      user_id: a.user_id,
      appointment_type: a.appointment_type ?? "fisio_club",
      appointment_date: a.appointment_date,
      appointment_time: a.appointment_time?.slice(0, 5) ?? "",
      reasons: a.reasons ?? [],
      notes: a.notes ?? "",
      status: a.status ?? "scheduled",
    });
    setOpen(true);
  }
  function toggleReason(r: string) {
    setForm((f) => ({ ...f, reasons: f.reasons.includes(r) ? f.reasons.filter((x) => x !== r) : [...f.reasons, r] }));
  }
  async function save() {
    if (!form.user_id) { toast.error("Seleccioná un atleta"); return; }
    const payload: any = {
      user_id: form.user_id,
      appointment_type: form.appointment_type,
      appointment_date: form.appointment_date,
      appointment_time: form.appointment_time || null,
      reasons: form.reasons,
      notes: form.notes || null,
      status: form.status,
    };
    if (editing) {
      const { error } = await supabase.from("physio_appointments").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      await createNotifications({
        user_ids: [form.user_id],
        title: "Cita de fisio modificada",
        body: `${typeLabel(form.appointment_type)} · ${form.appointment_date}${form.appointment_time ? ` ${form.appointment_time}` : ""}`,
        link: "/atleta/fisio", kind: "fisio", created_by: user!.id,
      });
    } else {
      const { error } = await supabase.from("physio_appointments").insert({ ...payload, created_by: user!.id });
      if (error) { toast.error(error.message); return; }
      await createNotifications({
        user_ids: [form.user_id],
        title: "Nueva cita asignada",
        body: `${typeLabel(form.appointment_type)} · ${form.appointment_date}${form.appointment_time ? ` ${form.appointment_time}` : ""}`,
        link: "/atleta/fisio", kind: "fisio", created_by: user!.id,
      });
    }
    toast.success("Guardado"); setOpen(false); load();
  }
  async function remove(id: string) {
    if (!confirm("¿Eliminar esta cita?")) return;
    const { error } = await supabase.from("physio_appointments").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  }

  async function quickStatus(a: any, status: string) {
    const { error } = await supabase.from("physio_appointments").update({ status }).eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    setAppointments((cur) => cur.map((x) => x.id === a.id ? { ...x, status } : x));
    toast.success("Estado actualizado");
  }

  async function downloadPdf() {
    await exportPdf({
      title: "Citas con fisioterapeuta",
      subtitle: `${appointments.length} citas totales · ${byAthlete.length} atletas`,
      chartEls: [reasonsRef.current!, athletesRef.current!].filter(Boolean),
      tables: [
        { title: "Por atleta", head: ["Atleta", "Puesto", "Total", "Asistidas", "Programadas", "Canceladas"],
          rows: byAthlete.map((a: any) => [a.name, a.position, a.total, a.attended, a.scheduled, a.cancelled]) },
        { title: "Por motivo", head: ["Motivo", "Frecuencia"], rows: byReason.map((r) => [r.reason, r.count]) },
        { title: "Detalle", head: ["Fecha", "Hora", "Tipo", "Atleta", "Estado", "Motivos"],
          rows: appointments.map((a) => {
            const p = profiles[a.user_id];
            return [a.appointment_date, a.appointment_time?.slice(0,5) ?? "—", typeLabel(a.appointment_type), p ? `${p.full_name}${p.last_name ? " " + p.last_name : ""}` : "—", a.status, (a.reasons ?? []).join(" · ")];
          }) },
      ],
      filename: `fisio_${new Date().toISOString().slice(0, 10)}.pdf`,
    });
  }

  const [recOpen, setRecOpen] = useState(false);
  const [recKey, setRecKey] = useState(0);

  return (
    <Shell title="Fisioterapia">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Asigna citas y abre bloques de turnos para que los atletas reserven.</p>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => openNew()}><Plus className="h-4 w-4 mr-2" />Nueva cita</Button>
          <Button variant="outline" onClick={() => setRecOpen(true)}>Abrir turnos recurrentes</Button>
          <Button variant="outline" onClick={downloadPdf}><FileDown className="h-4 w-4 mr-2" />PDF</Button>
        </div>
      </div>


      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground mr-1">Tipo:</span>
        {[{ v: "all", l: "Todas", icon: "📋" }, ...APPOINTMENT_TYPES].map((t) => (
          <button key={t.v} type="button" onClick={() => setTypeFilter(t.v)}
            className={`px-3 py-1.5 text-xs uppercase tracking-wider border ${typeFilter === t.v ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}>
            <span className="mr-1">{t.icon}</span>{t.l}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-3 mb-8">
        <Stat label={typeFilter === "all" ? "Citas totales" : `Citas (${typeLabel(typeFilter)})`} value={filtered.length} />
        <Stat label="Atletas con citas" value={byAthlete.length} />
        <Stat label="Asistidas" value={filtered.filter((a) => a.status === "attended").length} />
      </div>

      <PendingRequests
        appointments={appointments}
        profiles={profiles}
        onAssign={(a: any) => openEdit({ ...a, status: "scheduled" })}
      />

      <div className="grid lg:grid-cols-[1fr_360px] gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Agenda mensual</p>
          <MonthCalendar
            month={month}
            events={calEvents}
            onPrev={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            onNext={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            onDayClick={(d) => setSelectedDate(d)}
          />
        </div>
        <div className="border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{selectedDate ? new Date(selectedDate + "T12:00").toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" }) : "Elegí un día"}</p>
            {selectedDate && <Button size="sm" variant="outline" onClick={() => openNew(selectedDate)}><Plus className="h-3 w-3 mr-1" />Asignar</Button>}
          </div>
          {!selectedDate && <p className="text-sm text-muted-foreground">Tocá un día en el calendario para ver el orden de atención.</p>}
          {selectedDate && dayAppointments.length === 0 && <p className="text-sm text-muted-foreground">Sin citas ese día.</p>}
          <div className="space-y-2">
            {dayAppointments.map((a) => {
              const p = profiles[a.user_id];
              return (
                <div key={a.id} className="border border-border p-2">
                  <button onClick={() => openEdit(a)} className="w-full text-left hover:bg-accent">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm w-12 flex items-center gap-1"><Clock className="h-3 w-3" />{a.appointment_time?.slice(0, 5) ?? "--:--"}</span>
                      <span className="text-base">{typeIcon(a.appointment_type)}</span>
                      <span className="flex-1 text-sm font-medium truncate">{p ? `${p.full_name}${p.last_name ? " " + p.last_name : ""}` : "—"}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 ml-14"><MapPin className="inline h-2.5 w-2.5 mr-0.5" />{typeLabel(a.appointment_type)}{a.reasons?.length ? ` · ${a.reasons.slice(0,2).join(", ")}` : ""}</p>
                  </button>
                  <div className="flex gap-1 mt-2 ml-14">
                    {[{ v: "scheduled", l: "Programada" }, { v: "attended", l: "Asistida" }, { v: "cancelled", l: "Cancelada" }].map((s) => (
                      <button key={s.v} type="button" onClick={(e) => { e.stopPropagation(); quickStatus(a, s.v); }}
                        className={`px-2 py-0.5 text-[9px] uppercase tracking-wider border ${a.status === s.v ? (s.v === "attended" ? "bg-green-600 text-white border-green-600" : s.v === "cancelled" ? "bg-red-600 text-white border-red-600" : "bg-primary text-primary-foreground border-primary") : "border-border hover:bg-accent"}`}>
                        {s.l}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div ref={reasonsRef} className="border border-border p-6 mb-4 bg-background">
        <h2 className="text-xl mb-1">Motivos más frecuentes</h2>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Top motivos reportados</p>
        {byReason.length === 0 ? <p className="text-sm text-muted-foreground">Sin datos.</p> : (
          <ResponsiveContainer width="100%" height={Math.max(260, byReason.length * 22)}>
            <BarChart data={byReason.slice(0, 15)} layout="vertical" margin={{ top: 5, right: 20, left: 140, bottom: 5 }}>
              <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
              <XAxis type="number" stroke="#000" fontSize={11} allowDecimals={false} />
              <YAxis type="category" dataKey="reason" stroke="#000" fontSize={10} width={140} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #000", borderRadius: 0 }} />
              <Bar dataKey="count" fill="#dc2626" name="Citas" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div ref={athletesRef} className="border border-border p-6 mb-4 bg-background">
        <h2 className="text-xl mb-1">Por atleta</h2>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Cantidad de citas por jugador</p>
        {byAthlete.length === 0 ? <p className="text-sm text-muted-foreground">Sin datos.</p> : (
          <div className="border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-xs uppercase tracking-wider">
                <tr><th className="p-2 text-left">Atleta</th><th className="p-2">Puesto</th><th className="p-2">Total</th><th className="p-2">Asistidas</th><th className="p-2">Programadas</th><th className="p-2">Canceladas</th></tr>
              </thead>
              <tbody>
                {byAthlete.map((a: any) => (
                  <tr key={a.id} className="border-t border-border">
                    <td className="p-2"><Link to="/coach/atleta/$id" params={{ id: a.id }} className="hover:underline">{a.name}</Link></td>
                    <td className="p-2 text-center text-xs">{a.position}</td>
                    <td className="p-2 text-center font-medium">{a.total}</td>
                    <td className="p-2 text-center">{a.attended}</td>
                    <td className="p-2 text-center">{a.scheduled}</td>
                    <td className="p-2 text-center">{a.cancelled}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialog: assign / edit appointment */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar cita" : "Nueva cita"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Atleta</Label>
              <Select value={form.user_id} onValueChange={(v) => setForm({ ...form, user_id: v })}>
                <SelectTrigger><SelectValue placeholder="Elegir atleta..." /></SelectTrigger>
                <SelectContent>
                  {athletes.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.full_name}{a.last_name ? ` ${a.last_name}` : ""}{a.position ? ` · ${a.position}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo de cita</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {APPOINTMENT_TYPES.map((t) => (
                  <button key={t.v} type="button" onClick={() => setForm({ ...form, appointment_type: t.v })}
                    className={`p-3 text-center border ${form.appointment_type === t.v ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}>
                    <div className="text-xl mb-1">{t.icon}</div>
                    <div className="text-[10px] uppercase tracking-wider leading-tight">{t.l}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={form.appointment_date} onChange={(e) => setForm({ ...form, appointment_date: e.target.value })} />
              </div>
              <div>
                <Label>Hora</Label>
                <Input type="time" value={form.appointment_time} onChange={(e) => setForm({ ...form, appointment_time: e.target.value })} />
              </div>
            </div>

            <div>
              <Label>Estado</Label>
              <div className="flex gap-2 mt-1">
                {[{ v: "scheduled", l: "Programada" }, { v: "attended", l: "Asistida" }, { v: "cancelled", l: "Cancelada" }].map((s) => (
                  <button key={s.v} type="button" onClick={() => setForm({ ...form, status: s.v })}
                    className={`px-3 py-1.5 text-xs uppercase tracking-wider border ${form.status === s.v ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>
                    {s.l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Motivos (opcional)</Label>
              <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
                {COMMON_RUGBY_PAINS.map((g) => (
                  <div key={g.group} className="border border-border p-2">
                    <p className="text-[10px] uppercase tracking-wider font-medium mb-1">{g.group}</p>
                    <div className="grid grid-cols-2 gap-1">
                      {g.items.map((it) => (
                        <label key={it} className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <Checkbox checked={form.reasons.includes(it)} onCheckedChange={() => toggleReason(it)} />
                          <span>{it}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Notas</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>

          <DialogFooter>
            {editing && <Button variant="ghost" onClick={() => { remove(editing.id); setOpen(false); }}><Trash2 className="h-4 w-4 mr-1" />Borrar</Button>}
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>{editing ? "Actualizar" : "Asignar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mt-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Bloques recurrentes de turnos</p>
        <RecurringList kind="physio_slot" refreshKey={recKey} />
      </div>

      <RecurringDialog open={recOpen} onOpenChange={setRecOpen} kind="physio_slot" onCreated={() => { setRecKey((k) => k + 1); load(); }} />
    </Shell>
  );
}


function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-3xl font-display mt-1">{value}</p>
    </div>
  );
}
