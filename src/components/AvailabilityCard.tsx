import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ClipboardCheck, Check } from "lucide-react";
import { fmtDateLong } from "@/lib/format-date";

import { SurveyFields } from '@/components/SurveyFields';
import { getAnswers, getQuestions, validateAnswers, type SurveyPoll, type SurveyAnswers } from '@/lib/surveys';

type AnswerState = { values: SurveyAnswers; comment: string; saved: boolean };
export function AvailabilityCard({ userId }: { userId: string }) {
  const [polls, setPolls] = useState<SurveyPoll[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [saving, setSaving] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from("availability_polls").select("id,title,description,options,multi,closes_at,event_date,active,questions").eq("active", true).order("created_at", { ascending: false });
      if (error) { toast.error("No se pudieron cargar las encuestas"); return; }
      const open = (data ?? []).filter(p => !p.closes_at || new Date(p.closes_at).getTime() > Date.now());
      if (cancelled) return;
      setPolls(open);
      if (!open.length) return;
      const { data: responses, error: responseError } = await supabase.from("availability_responses").select("poll_id,selected,comment,answers").eq("user_id", userId).in("poll_id", open.map(p => p.id));
      if (responseError) { toast.error("No se pudieron cargar tus respuestas"); return; }
      const map: Record<string, AnswerState> = {};
      open.forEach(p => { const r = responses?.find(r => r.poll_id === p.id); map[p.id] = { values: getAnswers(r), comment: r?.comment ?? "", saved: !!r }; });
      if (!cancelled) setAnswers(map);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  async function save(poll: SurveyPoll) {
    const answer = answers[poll.id];
    if (!answer) return;
    if (poll.closes_at && new Date(poll.closes_at).getTime() <= Date.now()) return toast.error("La encuesta está cerrada");
    const errorMessage = validateAnswers(getQuestions(poll), answer.values);
    if (errorMessage) return toast.error(errorMessage);
    setSaving(poll.id);
    const legacy = answer.values.legacy;
    const { error } = await supabase.from("availability_responses").upsert({ poll_id: poll.id, user_id: userId, selected: Array.isArray(legacy) ? legacy : [], answers: answer.values, comment: answer.comment.trim() || null }, { onConflict: "poll_id,user_id" });
    setSaving(null);
    if (error) return toast.error(error.message);
    setAnswers(prev => ({ ...prev, [poll.id]: { ...answer, saved: true } }));
    toast.success("Respuesta guardada");
  }
  if (!polls.length) return null;
  return <div className="space-y-4"><p className="text-xs uppercase text-muted-foreground">ENCUESTA</p>{polls.map(p => {
    const a = answers[p.id] ?? { values: {}, comment: "", saved: false };
    return <div key={p.id} className="border-2 border-foreground p-4 sm:p-5 space-y-4">
      <div className="flex gap-2 items-start"><ClipboardCheck className="size-5 shrink-0" /><h2 className="text-xl break-words min-w-0">{p.title}</h2></div>
      {p.description && <p className="text-sm text-muted-foreground break-words">{p.description}</p>}
      {(p.event_date || p.closes_at) && <p className="text-xs text-muted-foreground">{p.event_date ? `Evento: ${fmtDateLong(p.event_date)}` : ""}{p.closes_at ? ` · Cierra: ${new Date(p.closes_at).toLocaleString("es")}` : ""}</p>}
      <SurveyFields questions={getQuestions(p)} answers={a.values} disabled={saving === p.id} onChange={values => setAnswers(prev => ({ ...prev, [p.id]: { ...a, values, saved: false } }))} />
      <Textarea rows={2} aria-label="Comentario adicional" placeholder="Comentario adicional (opcional)" value={a.comment} onChange={e => setAnswers(prev => ({ ...prev, [p.id]: { ...a, comment: e.target.value, saved: false } }))} />
      <div className="flex flex-wrap items-center gap-3"><Button size="sm" disabled={saving === p.id} onClick={() => save(p)}>{saving === p.id ? "Guardando…" : a.saved ? "Actualizar respuesta" : "Enviar respuesta"}</Button>{a.saved && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Check className="size-4" />Respuesta guardada</span>}</div>
    </div>;
  })}</div>;
}
