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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { APPOINTMENT_TYPES, typeLabel, typeIcon } from "@/lib/appointment-types";

export const Route = createFileRoute("/atleta/fisio")({
  component: () => <Protected requireRole="atleta"><AthletePhysio /></Protected>,
});

export const COMMON_RUGBY_PAINS = [
  { group: "Traumatismos", items: [
    "Conmoción / golpe en la cabeza",
    "Hombro (luxación / AC)",
    "Costillas / tórax",
    "Mano / dedos",
    "Rodilla (golpe directo)",
    "Tobillo (esguince)",
    "Cara / nariz",
    "Cervical",
  ]},
  { group: "Lesiones musculares", items: [
    "Isquiotibiales",
    "Cuádriceps",
    "Aductores",
    "Gemelos / sóleo",
    "Psoas / cadera",
    "Lumbar",
    "Dorsal / trapecio",
    "Pectoral",
  ]},
  { group: "Articular / tendinoso", items: [
    "Rodilla (tendinitis rotuliana)",
    "Tobillo (inestabilidad crónica)",
    "Codo",
    "Muñeca",
    "Hombro (manguito rotador)",
  ]},
  { group: "Otros", items: [
    "Control post-lesión",
    "Recuperación / descarga",
    "Evaluación preventiva",
  ]},
];

function AthletePhysio() {
  const { user } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({
    appointment_type: "fisio_club" as string,
    appointment_date: new Date().toISOString().slice(0, 10),
    appointment_time: "",
    reasons: [] as string[],
    notes: "",
    status: "scheduled",
  });

  async function load() {
    const { data } = await supabase.from("physio_appointments").select("*").eq("user_id", user!.id).order("appointment_date", { ascending: false });
    setList(data ?? []);
  }
  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setForm({ appointment_type: "fisio_club", appointment_date: new Date().toISOString().slice(0, 10), appointment_time: "", reasons: [], notes: "", status: "scheduled" });
    setOpen(true);
  }
  function openEdit(a: any) {
    setEditing(a);
    setForm({
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
    if (form.appointment_type !== "presoterapia" && !form.reasons.length) { toast.error("Marcá al menos un motivo"); return; }
    const payload: any = {
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
    } else {
      const { error } = await supabase.from("physio_appointments").insert({ ...payload, user_id: user!.id });
      if (error) { toast.error(error.message); return; }
    }
    toast.success("Guardado"); setOpen(false); load();
  }
  async function remove(id: string) {
    if (!confirm("¿Eliminar esta cita?")) return;
    const { error } = await supabase.from("physio_appointments").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  }

  const upcoming = list.filter((a) => a.appointment_date >= new Date().toISOString().slice(0, 10));
  const past = list.filter((a) => a.appointment_date < new Date().toISOString().slice(0, 10));

  return (
    <Shell title="Fisioterapia">
      <p className="text-sm text-muted-foreground mb-6">Registrá tus citas con el fisio y el motivo. El cuerpo técnico podrá ver tu historial.</p>

      <Button onClick={openNew} className="mb-6"><Plus className="h-4 w-4 mr-2" />Nueva cita</Button>

      <Section title="Próximas" items={upcoming} onEdit={openEdit} onDelete={remove} />
      <Section title="Historial" items={past} onEdit={openEdit} onDelete={remove} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar cita" : "Nueva cita con fisio"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
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
                {[
                  { v: "scheduled", l: "Programada" },
                  { v: "attended", l: "Asistida" },
                  { v: "cancelled", l: "Cancelada" },
                ].map((s) => (
                  <button key={s.v} type="button" onClick={() => setForm({ ...form, status: s.v })}
                    className={`px-3 py-1.5 text-xs uppercase tracking-wider border ${form.status === s.v ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>
                    {s.l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Motivos (tickeá los que correspondan)</Label>
              <div className="space-y-3 mt-2">
                {COMMON_RUGBY_PAINS.map((g) => (
                  <div key={g.group} className="border border-border p-3">
                    <p className="text-xs uppercase tracking-wider font-medium mb-2">{g.group}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {g.items.map((it) => (
                        <label key={it} className="flex items-center gap-2 text-sm cursor-pointer">
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
              <Label>Notas (opcional)</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Detalle, lado afectado, intensidad…" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>{editing ? "Actualizar" : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}

function Section({ title, items, onEdit, onDelete }: any) {
  if (!items.length) return null;
  return (
    <div className="mb-8">
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{title}</p>
      <div className="border border-border">
        {items.map((a: any) => (
          <div key={a.id} className="flex items-start gap-3 p-3 border-b border-border last:border-b-0">
            <span className="text-xl mt-0.5 flex-shrink-0" aria-hidden>{typeIcon(a.appointment_type)}</span>
            <button onClick={() => onEdit(a)} className="flex-1 text-left">
              <p className="text-sm font-medium">
                {new Date(a.appointment_date + "T12:00").toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" })}
                {a.appointment_time && ` · ${a.appointment_time.slice(0, 5)}`}
                <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">{a.status === "attended" ? "Asistida" : a.status === "cancelled" ? "Cancelada" : "Programada"}</span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{typeLabel(a.appointment_type)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{(a.reasons ?? []).join(" · ") || "—"}</p>
              {a.notes && <p className="text-xs mt-1 italic">{a.notes}</p>}
            </button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(a.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
