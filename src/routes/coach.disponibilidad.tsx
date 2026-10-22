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
import { SurveyQuestionEditor } from "@/components/SurveyQuestionEditor";
import { SurveyResults } from "@/components/SurveyResults";
import { getQuestions, newQuestion, validateQuestions, type SurveyPoll, type SurveyResponse, type SurveyQuestion } from "@/lib/surveys";
import { SubTabs, PLANIFICACION_TABS } from "@/components/SubTabs";
import { toast } from "sonner";
import { notifyAllAthletes } from "@/lib/notifications";
import { ClipboardCheck, Plus, Trash2, X, ChevronDown } from "lucide-react";
import { fmtDateLong } from "@/lib/format-date";

export const Route = createFileRoute("/coach/disponibilidad")({
  head: () => ({
    meta: [
      { title: "Encuesta · El Toro Rugby Performance" },
      { name: "description", content: "Encuestas del plantel con preguntas personalizadas, respuestas y análisis." },
      { property: "og:title", content: "Encuesta · El Toro Rugby Performance" },
      { property: "og:description", content: "Encuestas del plantel con preguntas personalizadas, respuestas y análisis." },
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

type Poll = SurveyPoll;
type Resp = SurveyResponse;

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
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState("");
  const [closesAt, setClosesAt] = useState("");


  async function load() {
    const [{ data: p }, { data: r }, { data: profs }, { data: roles }] = await Promise.all([
      supabase.from("availability_polls").select("id,title,description,options,multi,active,closes_at,event_date,created_at,questions").order("created_at", { ascending: false }),
      supabase.from("availability_responses").select("poll_id, user_id, selected, comment, answers, updated_at"),
      supabase.from("profiles").select("id, full_name, last_name"),
      supabase.from("user_roles").select("user_id").eq("role", "atleta"),
    ]);
    setPolls((p ?? []) as Poll[]);
    setResps((r ?? []) as Resp[]);
    const map: Record<string, string> = {};
    (profs ?? []).forEach((x) => {
      map[x.id] = `${x.full_name ?? ""}${x.last_name ? ` ${x.last_name}` : ""}`.trim();
    });
    setNames(map);
    setAthleteCount((roles ?? []).length);
  }

  useEffect(() => {
    load();
  }, []);

  async function createPoll() {
    if (!user) return;
    if (!title.trim()) return toast.error("Ponle un título a la encuesta");
    const validation = validateQuestions(questions);
    if (validation) return toast.error(validation);
    if (closesAt && new Date(closesAt).getTime() <= Date.now()) return toast.error("El cierre debe ser una fecha futura");
    const normalized = questions.map(q => ({ ...q, title: q.title.trim(), options: q.type === "text" ? [] : q.options.map(o => o.trim()).filter(Boolean), improvementOptions: q.improvementOptions.map(o => o.trim()).filter(Boolean) }));
    const payload = { title: title.trim(), description: desc.trim() || null, options: normalized[0]?.options ?? [], multi: normalized[0]?.type === "multiple", questions: normalized, event_date: eventDate || null, closes_at: closesAt ? new Date(closesAt).toISOString() : null };
    setSaving(true);
    const result = editing
      ? await supabase.from("availability_polls").update(payload).eq("id", editing)
      : await supabase.from("availability_polls").insert({ ...payload, active: true, created_by: user.id });
    setSaving(false);
    if (result.error) return toast.error(result.error.message);
    if (!editing) await notifyAllAthletes({ title: "Nueva encuesta", body: title.trim(), link: "/atleta", kind: "info", created_by: user.id });
    toast.success(editing ? "Encuesta actualizada" : "Encuesta activada y notificada al plantel");
    setOpen(false); setEditing(null); setTitle(""); setDesc(""); setEventDate(""); setClosesAt(""); setQuestions([]);
    load();
  }

  function editPoll(poll: Poll) {
    setEditing(poll.id); setTitle(poll.title); setDesc(poll.description ?? "");
    setEventDate(poll.event_date ?? "");
    const close = poll.closes_at ? new Date(poll.closes_at) : null;
    setClosesAt(close ? new Date(close.getTime() - close.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
    setQuestions(getQuestions(poll)); setOpen(true); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleActive(poll: Poll) {
    const { error } = await supabase
      .from("availability_polls")
      .update({ active: !poll.active })
      .eq("id", poll.id);
    if (error) return toast.error(error.message);
    setPolls((prev) => prev.map((p) => (p.id === poll.id ? { ...p, active: !p.active } : p)));
    if (!poll.active && user) await notifyAllAthletes({ title: "Encuesta abierta", body: poll.title, link: "/atleta", kind: "info", created_by: user.id });
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
          <h1 className="text-3xl sm:text-4xl">ENCUESTA</h1>

        </div>
        <Button size="sm" onClick={() => { if (!open) { setEditing(null); setTitle(""); setDesc(""); setEventDate(""); setClosesAt(""); setQuestions([newQuestion()]); } setOpen(v => !v); }}>
          {open ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          <span className="ml-1">{open ? "Cerrar" : "Nueva"}</span>
        </Button>
      </div>

      {open && (
        <div className="mb-6 border-2 border-foreground p-4 space-y-4">
          <div>
            <Label htmlFor="t">Título de la encuesta</Label>
            <Input id="t" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Evaluación del entrenamiento" />
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

          <SurveyQuestionEditor questions={questions} onChange={setQuestions} />

          <Button onClick={createPoll} disabled={saving} className="w-full">
            {saving ? "Guardando…" : editing ? "Guardar cambios" : "Activar y notificar al plantel"}
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {polls.length === 0 && (
          <div className="border border-border p-8 text-center text-sm text-muted-foreground">
            Todavía no hay encuestas.
          </div>
        )}
        {polls.map((p) => {
          const rs = resps.filter((r) => r.poll_id === p.id);

          const isOpen = expanded === p.id;
          return (
            <div key={p.id} className="border-2 border-foreground">
              <div className="flex items-start justify-between gap-3 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4" />
                    <h2 className="text-xl leading-tight">{p.title}</h2>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.active && (!p.closes_at || new Date(p.closes_at).getTime() > Date.now()) ? "Activa" : "Cerrada"}
                    {p.event_date ? ` · Evento: ${fmtDateLong(p.event_date)}` : ""}
                    {p.closes_at ? ` · Cierra: ${new Date(p.closes_at).toLocaleString()}` : ""}
                    {` · ${rs.length}/${athleteCount} respuestas`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button size="sm" variant="outline" disabled={rs.length > 0} title={rs.length ? "Las preguntas no se modifican después de recibir respuestas" : "Editar encuesta"} onClick={() => editPoll(p)}>Editar</Button>
                  <Button size="sm" variant="outline" disabled={!p.active && !!p.closes_at && new Date(p.closes_at).getTime() <= Date.now()} onClick={() => toggleActive(p)}>
                    {p.active ? "Cerrar" : "Reabrir"}
                  </Button>
                  <Button size="icon" variant="outline" onClick={() => removePoll(p.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button variant="ghost" onClick={() => setExpanded(isOpen ? null : p.id)} className="flex w-full justify-between border-t border-border rounded-none">
                <span>Resultados y respuestas</span><ChevronDown className={"size-4 " + (isOpen ? "rotate-180" : "")} />
              </Button>
              {isOpen && <SurveyResults poll={p} responses={rs} names={names} athleteCount={athleteCount} />}

            </div>
          );
        })}
      </div>
    </Shell>
  );
}
