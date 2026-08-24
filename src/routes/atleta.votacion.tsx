import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { SubTabs, HISTORIAL_TABS } from "@/components/SubTabs";
import { Protected } from "@/lib/protected";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Vote, Trophy, Info, CheckCircle2 } from "lucide-react";
import { startOfWeek, isoDate, weekDays } from "@/lib/week-utils";
import { fmtDate } from "@/lib/format-date";

export const Route = createFileRoute("/atleta/votacion")({
  head: () => ({
    meta: [
      { title: "Votación semanal · El Toro Rugby Performance" },
      { name: "description", content: "Vota al compañero que mejor entrenó esta semana y explica por qué. El más votado gana 7 puntos extra." },
      { property: "og:title", content: "Votación semanal · El Toro Rugby Performance" },
      { property: "og:description", content: "Vota al compañero que mejor entrenó esta semana y explica por qué." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <Protected requireRole="atleta"><Votacion /></Protected>,
});

type Candidate = { user_id: string; full_name: string | null; last_name: string | null; position: string | null };

function fullName(c: { full_name: string | null; last_name: string | null }) {
  return `${c.full_name ?? ""}${c.last_name ? ` ${c.last_name}` : ""}`.trim() || "Atleta";
}

/** Ventana de votación: viernes 19:00 → domingo 22:00 (hora local). */
function voteWindow(now = new Date()) {
  const mon = startOfWeek(now);
  const opens = new Date(mon);
  opens.setDate(mon.getDate() + 4);
  opens.setHours(19, 0, 0, 0);
  const closes = new Date(mon);
  closes.setDate(mon.getDate() + 6);
  closes.setHours(22, 0, 0, 0);
  const t = now.getTime();
  return { opens, closes, isOpen: t >= opens.getTime() && t <= closes.getTime(), before: t < opens.getTime() };
}

function Votacion() {
  const { user } = useAuth();
  const weekStart = useMemo(() => isoDate(startOfWeek()), []);
  const weekEnd = useMemo(() => weekDays()[6], []);
  const win = useMemo(() => voteWindow(), []);

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [nominee, setNominee] = useState<string>("");
  const [comment, setComment] = useState("");
  const [voteId, setVoteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [winners, setWinners] = useState<Array<{ nominee_id: string; full_name: string | null; last_name: string | null; votes: number }>>([]);
  const [totalVotes, setTotalVotes] = useState(0);

  async function load() {
    if (!user) return;
    const year = new Date().getFullYear();
    const { data: rows } = await supabase.rpc("gamification_leaderboard" as any, {
      _from: `${year}-01-01`,
      _to: `${year}-12-31`,
    } as any);
    const list = ((rows as unknown as Candidate[]) ?? [])
      .filter((r) => r.user_id !== user.id)
      .sort((a, b) => fullName(a).localeCompare(fullName(b)));
    setCandidates(list);

    const { data: mine } = await supabase
      .from("weekly_votes")
      .select("*")
      .eq("voter_id", user.id)
      .eq("week_start", weekStart)
      .maybeSingle();
    if (mine) { setVoteId(mine.id); setNominee(mine.nominee_id); setComment(mine.comment ?? ""); }
    else { setVoteId(null); }

    const { data: w } = await supabase.rpc("weekly_vote_winners" as any, { _week_start: weekStart } as any);
    const ws = (w as unknown as Array<{ nominee_id: string; full_name: string | null; last_name: string | null; votes: number }>) ?? [];
    setWinners(ws);
    setTotalVotes(ws.reduce((s, x) => s + x.votes, 0));
  }

  useEffect(() => { load(); }, [user]);

  async function save() {
    if (!user) return;
    if (!win.isOpen) { toast.error("La votación está cerrada"); return; }
    if (voteId) { toast.error("Ya votaste esta semana: el voto es único"); return; }
    if (!nominee) { toast.error("Elige al compañero que mejor entrenó"); return; }
    const c = comment.trim();
    if (c.length < 10) { toast.error("El comentario es obligatorio: explica en pocas palabras por qué lo votas"); return; }
    setSaving(true);
    const { data, error } = await supabase
      .from("weekly_votes")
      .insert({ voter_id: user.id, nominee_id: nominee, week_start: weekStart, comment: c })
      .select("id")
      .single();
    if (error) { toast.error(error.message); setSaving(false); return; }
    setVoteId(data.id);
    setSaving(false);
    toast.success("Voto registrado");
    load();
  }

  return (
    <Shell title="Votación semanal">
      <SubTabs tabs={HISTORIAL_TABS} />

      <div className="border-2 border-black p-4 sm:p-5 mb-6">
        <div className="flex items-start gap-3">
          <Vote className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Semana {fmtDate(weekStart)} – {fmtDate(weekEnd)}
            </p>
            <h2 className="font-display text-lg uppercase tracking-wide mt-0.5">¿Quién entrenó mejor esta semana?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              El compañero más votado suma <strong>7 puntos extra</strong>, que cuentan para el ranking del mes y para la temporada.
            </p>
          </div>
        </div>
      </div>

      <div className="border border-border p-4 mb-6 flex items-start gap-3">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          El comentario es <strong>obligatorio</strong>: cuenta por qué lo votas (actitud, intensidad, compromiso).
          Sé <strong>respetuoso</strong>: el cuerpo técnico lee todos los comentarios.
        </p>
      </div>

      <div className="border border-border p-6 mb-6">
        <Label className="text-xs uppercase tracking-wider">Tu voto</Label>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {candidates.map((c) => (
            <button
              key={c.user_id}
              type="button"
              onClick={() => setNominee(c.user_id)}
              className={`text-left px-3 py-2 border text-sm transition ${
                nominee === c.user_id ? "bg-black text-white border-black" : "border-border hover:bg-accent"
              }`}
            >
              <span className="font-medium">{fullName(c)}</span>
              {c.position && (
                <span className={`ml-2 text-[10px] ${nominee === c.user_id ? "text-white/70" : "text-muted-foreground"}`}>
                  {c.position}
                </span>
              )}
            </button>
          ))}
          {candidates.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay compañeros para votar.</p>}
        </div>

        <div className="mt-4">
          <Label htmlFor="c">Por qué lo votas (obligatorio)</Label>
          <Textarea
            id="c"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Ej.: fue el más intenso en cada ejercicio y ayudó al grupo toda la semana."
          />
          <p className="text-[11px] text-muted-foreground mt-1">{comment.trim().length}/10 caracteres mínimos</p>
        </div>

        <Button onClick={save} disabled={saving} className="w-full mt-4" size="lg">
          {saving ? "Guardando..." : voteId ? "Actualizar mi voto" : "Votar"}
        </Button>
        {voteId && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Ya votaste esta semana. Puedes cambiar tu voto hasta que termine.
          </p>
        )}
      </div>

      <div className="border border-border p-6">
        <h3 className="text-lg mb-2 flex items-center gap-2"><Trophy className="h-4 w-4" /> Más votado de la semana</h3>
        {winners.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay votos esta semana.</p>
        ) : (
          <>
            <ul className="space-y-1">
              {winners.map((w) => (
                <li key={w.nominee_id} className="flex items-center justify-between text-sm border border-border px-3 py-2">
                  <span>{fullName(w)}</span>
                  <span className="font-display tabular-nums">{w.votes} {w.votes === 1 ? "voto" : "votos"}</span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-muted-foreground mt-2">{totalVotes} votos contados en el liderazgo actual.</p>
          </>
        )}
      </div>
    </Shell>
  );
}
