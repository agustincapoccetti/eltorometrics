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
import { SubTabs, PLANIFICACION_TABS } from "@/components/SubTabs";
import { toast } from "sonner";
import { notifyAllAthletes } from "@/lib/notifications";
import { ClipboardCheck, Plus, Trash2, X, ChevronDown } from "lucide-react";
import { fmtDateLong } from "@/lib/format-date";

export const Route = createFileRoute("/coach/disponibilidad")({
  head: () => ({
    meta: [
      { title: "Disponibilidad · El Toro Rugby Performance" },
      { name: "description", content: "Crea encuestas de disponibilidad para partidos, reuniones y eventos del plantel." },
      { property: "og:title", content: "Disponibilidad · El Toro Rugby Performance" },
      { property: "og:description", content: "Crea encuestas de disponibilidad para partidos, reuniones y eventos del plantel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <Protected requireRole="coach">
      <CoachAvailability />
    </Protected>
  ),
});

type Poll = {
  id: string;
  title: string;
  description: string | null;
  options: string[];
  multi: boolean;
  active: boolean;
  closes_at: string | null;
  event_date: string | null;
  created_at: string;
};

type Resp = {
  poll_id: string;
  user_id: string;
  selected: string[];
  comment: string | null;
};

export default function CoachAvailability() {
  const { user } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [resps, setResps] = useState<Resp[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [athleteCount, setAthleteCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [multi, setMulti] = useState(true);
  const [eventDate, setEventDate] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [options, setOptions] = useState<string[]>(["Sí, disponible", "No disponible", "Con dudas"]);

  async function load() {
    const [{ data: p }, { data: r }, { data: profs }, { data: roles }] = await Promise.all([
      supabase.from("availability_polls").select("*").order("created_at", { ascending: false }),
      supabase.from("availability_responses").select("poll_id, user_id, selected, comment"),
      supabase.from("profiles").select("id, full_name, last_name"),
      supabase.from("user_roles").select("user_id").eq("role", "atleta"),
    ]);
    setPolls((p ?? []) as Poll[]);
    setResps((r ?? []) as Resp[]);
    const map: Record<string, string> = {};
    (profs ?? []).forEach((x: any) => {
      map[x.id] = `${x.full_name ?? ""}${x.last_name ? ` ${x.last_name}` : ""}`.trim();
    });
    setNames(map);
    setAthleteCount((roles ?? []).length);
  }

  useEffect(() => {
    load();
  }, []);

  async function createPoll() {
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (!title.trim()) return toast.error("Ponle un título a la encuesta");
    if (opts.length < 2) return toast.error("Agrega al menos dos opciones de respuesta");
    setSaving(true);
    const { error } = await supabase.from("availability_polls").insert({
      title: title.trim(),
      description: desc.trim() || null,
      options: opts,
      multi,
      active: true,
      event_date: eventDate || null,
      closes_at: closesAt ? new Date(closesAt).toISOString() : null,
      created_by: user!.id,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    await notifyAllAthletes({
      title: "Nueva encuesta de disponibilidad",
      body: title.trim(),
      link: "/atleta",
      kind: "info",
      created_by: user!.id,
    });
    toast.success("Encuesta activada y notificada al plantel");
    setOpen(false);
    setTitle(""); setDesc(""); setEventDate(""); setClosesAt("");
    setOptions(["Sí, disponible", "No disponible", "Con dudas"]);
    load();
  }

  async function toggleActive(poll: Poll) {
    const { error } = await supabase
      .from("availability_polls")
      .update({ active: !poll.active })
      .eq("id", poll.id);
    if (error) return toast.error(error.message);
    setPolls((prev) => prev.map((p) => (p.id === poll.id ? { ...p, active: !p.active } : p)));
  }

  async function removePoll(id: string) {
    if (!confirm("¿Eliminar esta encuesta y sus respuestas?")) return;
    const { error } = await supabase.from("availability_polls").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Encuesta eliminada");
    load();
  }

  return (
    <Shell>
      <SubTabs tabs={PLANIFICACION_TABS} />

      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Plantel</p>
          <h1 className="text-3xl sm:text-4xl">Disponibilidad</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consulta al plantel su disponibilidad para partidos, reuniones u otros eventos.
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen((v) => !v)}>
          {open ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          <span className="ml-1">{open ? "Cerrar" : "Nueva"}</span>
        </Button>
      </div>

      {open && (
        <div className="mb-6 border-2 border-black p-4 space-y-4">
          <div>
            <Label htmlFor="t">Título de la encuesta</Label>
            <Input id="t" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="¿Puedes venir al partido del sábado?" />
          </div>
          <div>
            <Label htmlFor="d">Detalle (opcional)</Label>
            <Textarea id="d" value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ed">Fecha del evento</Label>
              <Input id="ed" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ca">Cierra el</Label>
              <Input id="ca" type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Opciones de respuesta</Label>
            <div className="mt-2 space-y-2">
              {options.map((o, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={o}
                    onChange={(e) => setOptions((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
                    placeholder={`Opción ${i + 1}`}
                  />
                  <Button variant="outline" size="icon" onClick={() => setOptions((prev) => prev.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => setOptions((prev) => [...prev, ""])}>
              <Plus className="mr-1 h-4 w-4" /> Agregar opción
            </Button>
          </div>

          <div className="flex items-center justify-between border border-border p-3">
            <div>
              <p className="text-sm font-semibold">Elección múltiple</p>
              <p className="text-xs text-muted-foreground">Permite marcar varias opciones a la vez.</p>
            </div>
            <Switch checked={multi} onCheckedChange={setMulti} />
          </div>

          <Button onClick={createPoll} disabled={saving} className="w-full">
            {saving ? "Activando…" : "Activar y notificar al plantel"}
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {polls.length === 0 && (
          <div className="border border-border p-8 text-center text-sm text-muted-foreground">
            Todavía no hay encuestas de disponibilidad.
          </div>
        )}
        {polls.map((p) => {
          const rs = resps.filter((r) => r.poll_id === p.id);
          const counts = p.options.map((o) => ({ o, n: rs.filter((r) => r.selected.includes(o)).length }));
          const isOpen = expanded === p.id;
          return (
            <div key={p.id} className="border-2 border-black">
              <div className="flex items-start justify-between gap-3 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4" />
                    <h2 className="text-xl leading-tight">{p.title}</h2>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.active ? "Activa" : "Cerrada"}
                    {p.event_date ? ` · Evento: ${fmtDateLong(p.event_date)}` : ""}
                    {p.closes_at ? ` · Cierra: ${new Date(p.closes_at).toLocaleString()}` : ""}
                    {` · ${rs.length}/${athleteCount} respuestas`}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => toggleActive(p)}>
                    {p.active ? "Cerrar" : "Reabrir"}
                  </Button>
                  <Button size="icon" variant="outline" onClick={() => removePoll(p.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2 px-4 pb-4">
                {counts.map(({ o, n }) => (
                  <div key={o}>
                    <div className="mb-1 flex justify-between text-xs font-semibold uppercase tracking-wide">
                      <span>{o}</span>
                      <span>{n}</span>
                    </div>
                    <div className="h-2 w-full bg-secondary">
                      <div
                        className="h-full bg-foreground"
                        style={{ width: `${rs.length ? (n / Math.max(rs.length, 1)) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setExpanded(isOpen ? null : p.id)}
                className="flex w-full items-center justify-between border-t border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide hover:bg-accent"
              >
                <span>Respuestas por jugador</span>
                <ChevronDown className={"h-4 w-4 transition-transform " + (isOpen ? "rotate-180" : "")} />
              </button>
              {isOpen && (
                <div className="divide-y divide-border">
                  {rs.length === 0 && <p className="p-4 text-sm text-muted-foreground">Sin respuestas todavía.</p>}
                  {rs
                    .slice()
                    .sort((a, b) => (names[a.user_id] ?? "").localeCompare(names[b.user_id] ?? ""))
                    .map((r) => (
                      <div key={r.user_id} className="p-3 text-sm">
                        <p className="font-semibold">{names[r.user_id] ?? "Jugador"}</p>
                        <p className="text-muted-foreground">{r.selected.join(" · ")}</p>
                        {r.comment && <p className="mt-1 italic text-muted-foreground">“{r.comment}”</p>}
                      </div>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Shell>
  );
}
