import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ClipboardCheck, Check } from "lucide-react";
import { fmtDateLong } from "@/lib/format-date";

type Poll = {
  id: string;
  title: string;
  description: string | null;
  options: string[];
  multi: boolean;
  closes_at: string | null;
  event_date: string | null;
};

export function AvailabilityCard({ userId }: { userId: string }) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [answers, setAnswers] = useState<Record<string, { selected: string[]; comment: string; saved: boolean }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const nowIso = new Date().toISOString();
      const { data: ps } = await supabase
        .from("availability_polls")
        .select("id, title, description, options, multi, closes_at, event_date, active, closes_at")
        .eq("active", true)
        .order("created_at", { ascending: false });
      const open = (ps ?? []).filter((p: any) => !p.closes_at || p.closes_at > nowIso) as Poll[];
      setPolls(open);
      if (!open.length) return;
      const { data: rs } = await supabase
        .from("availability_responses")
        .select("poll_id, selected, comment")
        .eq("user_id", userId)
        .in("poll_id", open.map((p) => p.id));
      const map: Record<string, { selected: string[]; comment: string; saved: boolean }> = {};
      open.forEach((p) => {
        const r = (rs ?? []).find((x: any) => x.poll_id === p.id);
        map[p.id] = { selected: r?.selected ?? [], comment: r?.comment ?? "", saved: !!r };
      });
      setAnswers(map);
    })();
  }, [userId]);

  function toggle(poll: Poll, option: string) {
    setAnswers((prev) => {
      const cur = prev[poll.id] ?? { selected: [], comment: "", saved: false };
      const has = cur.selected.includes(option);
      const selected = poll.multi
        ? has
          ? cur.selected.filter((o) => o !== option)
          : [...cur.selected, option]
        : has
          ? []
          : [option];
      return { ...prev, [poll.id]: { ...cur, selected } };
    });
  }

  async function save(poll: Poll) {
    const a = answers[poll.id];
    if (!a?.selected.length) return toast.error("Elige al menos una opción");
    setSaving(poll.id);
    const { error } = await supabase
      .from("availability_responses")
      .upsert(
        { poll_id: poll.id, user_id: userId, selected: a.selected, comment: a.comment.trim() || null },
        { onConflict: "poll_id,user_id" },
      );
    setSaving(null);
    if (error) return toast.error(error.message);
    setAnswers((prev) => ({ ...prev, [poll.id]: { ...a, saved: true } }));
    toast.success("Respuesta guardada");
  }

  if (!polls.length) return null;

  return (
    <div className="space-y-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Disponibilidad</p>
      {polls.map((p) => {
        const a = answers[p.id] ?? { selected: [], comment: "", saved: false };
        return (
          <div key={p.id} className="border-2 border-black p-5">
            <div className="mb-2 flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              <h2 className="text-xl leading-tight">{p.title}</h2>
            </div>
            {p.description && <p className="mb-2 text-sm text-muted-foreground">{p.description}</p>}
            <p className="mb-3 text-xs text-muted-foreground">
              {p.event_date ? `Evento: ${fmtDateLong(p.event_date)}` : ""}
              {p.event_date && p.closes_at ? " · " : ""}
              {p.closes_at ? `Responde antes del ${new Date(p.closes_at).toLocaleString()}` : ""}
              {p.multi ? " · Puedes elegir varias opciones" : ""}
            </p>

            <div className="space-y-2">
              {p.options.map((o) => {
                const on = a.selected.includes(o);
                return (
                  <button
                    key={o}
                    onClick={() => toggle(p, o)}
                    className={
                      "flex w-full items-center justify-between border-2 px-3 py-2 text-left text-sm font-semibold transition " +
                      (on ? "border-black bg-foreground text-background" : "border-border hover:bg-accent")
                    }
                  >
                    <span>{o}</span>
                    {on && <Check className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>

            <Textarea
              className="mt-3"
              rows={2}
              placeholder="Comentario (opcional)"
              value={a.comment}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [p.id]: { ...a, comment: e.target.value } }))}
            />

            <div className="mt-3 flex items-center gap-3">
              <Button size="sm" onClick={() => save(p)} disabled={saving === p.id}>
                {saving === p.id ? "Guardando…" : a.saved ? "Actualizar respuesta" : "Enviar respuesta"}
              </Button>
              {a.saved && <span className="text-xs text-muted-foreground">Ya respondiste, puedes modificarlo.</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
