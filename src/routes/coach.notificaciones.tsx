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
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Pencil, BellRing, Send } from "lucide-react";
import { toast } from "sonner";
import { sendPushToTargets } from "@/lib/push.functions";

type Schedule = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  weekdays: number[];
  send_time: string;
  active: boolean;
  target_role: "atleta" | "coach";
  last_sent_at: string | null;
};

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const PRESETS: Array<{ label: string; title: string; body: string; link: string; weekdays: number[]; time: string }> = [
  {
    label: "Bienestar (lunes)",
    title: "Completa tu bienestar",
    body: "Responde el cuestionario de bienestar de hoy.",
    link: "/atleta/wellness",
    weekdays: [0],
    time: "08:30",
  },
  {
    label: "Recuperación (domingo)",
    title: "Formulario de recuperación",
    body: "Registra tus estrategias de recuperación de la semana.",
    link: "/atleta/recuperacion",
    weekdays: [6],
    time: "19:00",
  },
  {
    label: "RPE post-entreno",
    title: "Carga tu RPE",
    body: "¿Qué tan duro fue el entrenamiento de hoy?",
    link: "/atleta/rpe",
    weekdays: [1, 3],
    time: "21:30",
  },
];

export const Route = createFileRoute("/coach/notificaciones")({
  component: () => (
    <Protected requireRole="coach">
      <CoachPush />
    </Protected>
  ),
  head: () => ({
    meta: [
      { title: "Notificaciones push · El Toro Rugby Performance" },
      { name: "description", content: "Programa recordatorios push para los atletas del club El Toro Rugby." },
      { property: "og:title", content: "Notificaciones push · El Toro Rugby Performance" },
      { property: "og:description", content: "Programa recordatorios push para los atletas del club El Toro Rugby." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const EMPTY = {
  title: "",
  body: "",
  link: "/atleta",
  weekdays: [] as number[],
  send_time: "08:30",
  active: true,
  target_role: "atleta" as "atleta" | "coach",
};

function CoachPush() {
  const { user } = useAuth();
  const [list, setList] = useState<Schedule[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  // Aviso puntual
  const [instant, setInstant] = useState({ title: "", body: "", link: "/atleta" });
  const [sending, setSending] = useState(false);

  async function load() {
    const { data } = await supabase.from("push_schedules").select("*").order("send_time");
    setList((data ?? []) as Schedule[]);
  }
  useEffect(() => { load(); }, []);

  function openNew(preset?: (typeof PRESETS)[number]) {
    setEditing(null);
    setForm(
      preset
        ? { ...EMPTY, title: preset.title, body: preset.body, link: preset.link, weekdays: preset.weekdays, send_time: preset.time }
        : { ...EMPTY },
    );
    setOpen(true);
  }

  function openEdit(s: Schedule) {
    setEditing(s);
    setForm({
      title: s.title,
      body: s.body ?? "",
      link: s.link ?? "/atleta",
      weekdays: s.weekdays ?? [],
      send_time: (s.send_time ?? "08:30").slice(0, 5),
      active: s.active,
      target_role: s.target_role ?? "atleta",
    });
    setOpen(true);
  }

  async function save() {
    if (!user) return;
    if (!form.title.trim()) return toast.error("Escribe un título");
    if (!form.weekdays.length) return toast.error("Elige al menos un día");
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      body: form.body.trim() || null,
      link: form.link.trim() || null,
      weekdays: [...form.weekdays].sort((a, b) => a - b),
      send_time: form.send_time,
      active: form.active,
      target_role: form.target_role,
    };
    const { error } = editing
      ? await supabase.from("push_schedules").update(payload).eq("id", editing.id)
      : await supabase.from("push_schedules").insert({ ...payload, created_by: user.id });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Recordatorio actualizado" : "Recordatorio creado");
    setOpen(false);
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("push_schedules").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setList((c) => c.filter((s) => s.id !== id));
  }

  async function toggle(s: Schedule) {
    const { error } = await supabase.from("push_schedules").update({ active: !s.active }).eq("id", s.id);
    if (error) return toast.error(error.message);
    setList((c) => c.map((x) => (x.id === s.id ? { ...x, active: !x.active } : x)));
  }

  async function sendNow() {
    if (!instant.title.trim()) return toast.error("Escribe un título");
    setSending(true);
    try {
      const res = await sendPushToTargets({
        data: { role: "atleta", title: instant.title.trim(), body: instant.body.trim() || undefined, link: instant.link || "/atleta" },
      });
      toast.success(`Enviado a ${res.sent} dispositivo(s)`);
      setInstant({ title: "", body: "", link: "/atleta" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <Shell title="Notificaciones push">
      <div className="space-y-6">
        <div className="border-2 border-black p-4">
          <div className="flex items-center gap-2 mb-3">
            <Send className="h-4 w-4" />
            <h2 className="text-sm uppercase tracking-widest font-semibold">Aviso inmediato a todos los atletas</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input placeholder="Título" value={instant.title} onChange={(e) => setInstant({ ...instant, title: e.target.value })} />
            <Input placeholder="Mensaje" value={instant.body} onChange={(e) => setInstant({ ...instant, body: e.target.value })} />
            <Input placeholder="Enlace (/atleta)" value={instant.link} onChange={(e) => setInstant({ ...instant, link: e.target.value })} />
          </div>
          <Button className="mt-3" onClick={sendNow} disabled={sending}>
            {sending ? "Enviando..." : "Enviar ahora"}
          </Button>
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <BellRing className="h-4 w-4" />
              <h2 className="text-sm uppercase tracking-widest font-semibold">Recordatorios frecuentes</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <Button key={p.label} size="sm" variant="outline" onClick={() => openNew(p)}>{p.label}</Button>
              ))}
              <Button size="sm" onClick={() => openNew()}><Plus className="h-4 w-4 mr-1" />Nuevo</Button>
            </div>
          </div>

          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground border-2 border-dashed border-black/30 p-6 text-center">
              Todavía no hay recordatorios programados.
            </p>
          ) : (
            <div className="space-y-2">
              {list.map((s) => (
                <div key={s.id} className="border-2 border-black p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{s.title}</p>
                    {s.body && <p className="text-xs text-muted-foreground">{s.body}</p>}
                    <p className="text-[11px] mt-1 font-medium">
                      {(s.weekdays ?? []).map((d) => DAYS[d]).join(" · ") || "—"} · {(s.send_time ?? "").slice(0, 5)} ·{" "}
                      {s.target_role === "coach" ? "Cuerpo técnico" : "Atletas"}
                    </p>
                    {s.last_sent_at && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Último envío: {new Date(s.last_sent_at).toLocaleString("es")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={s.active} onCheckedChange={() => toggle(s)} aria-label="Activo" />
                    <Button size="sm" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar recordatorio" : "Nuevo recordatorio"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Título</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Mensaje</Label>
              <Textarea rows={2} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Hora</Label>
                <Input type="time" value={form.send_time} onChange={(e) => setForm({ ...form, send_time: e.target.value })} />
              </div>
              <div>
                <Label>Destinatarios</Label>
                <Select value={form.target_role} onValueChange={(v) => setForm({ ...form, target_role: v as "atleta" | "coach" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="atleta">Atletas</SelectItem>
                    <SelectItem value="coach">Cuerpo técnico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Enlace al abrir</Label>
              <Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
            </div>
            <div>
              <Label>Días</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {DAYS.map((d, i) => {
                  const on = form.weekdays.includes(i);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          weekdays: on ? form.weekdays.filter((x) => x !== i) : [...form.weekdays, i],
                        })
                      }
                      className={
                        "px-3 py-1.5 text-xs font-semibold border-2 border-black " +
                        (on ? "bg-black text-white" : "bg-white text-black")
                      }
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <span className="text-sm">Activo</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
