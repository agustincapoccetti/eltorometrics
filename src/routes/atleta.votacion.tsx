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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [myVote, setMyVote] = useState<{ week_start: string; nominee_id: string; comment: string; created_at: string } | null>(null);
  const [justVoted, setJustVoted] = useState(false);
  const [history, setHistory] = useState<Array<{ id: string; week_start: string; nominee_id: string; comment: string; created_at: string }>>([]);
  const [names, setNames] = useState<Record<string, string>>({});
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

    const { data: all } = await supabase
      .from("weekly_votes")
      .select("id, week_start, nominee_id, comment, created_at")
      .eq("voter_id", user.id)
      .order("week_start", { ascending: false });
    const rowsAll = all ?? [];
    setHistory(rowsAll);
    const mine = rowsAll.find((r) => r.week_start === weekStart) ?? null;
    if (mine) { setVoteId(mine.id); setMyVote(mine); setNominee(mine.nominee_id); setComment(mine.comment ?? ""); }
    else { setVoteId(null); setMyVote(null); }

    const ids = Array.from(new Set(rowsAll.map((r) => r.nominee_id)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, last_name").in("id", ids);
      const map: Record<string, string> = {};
      for (const p of profs ?? []) map[p.id] = fullName(p as any);
      setNames(map);
    }

    const { data: w } = await supabase.rpc("weekly_vote_winners" as any, { _week_start: weekStart } as any);
    const ws = (w as unknown as Array<{ nominee_id: string; full_name: string | null; last_name: string | null; votes: number }>) ?? [];
    setWinners(ws);
    setTotalVotes(ws.reduce((s, x) => s + x.votes, 0));
  }

  useEffect(() => { load(); }, [user]);

  const nomineeName = (id: string) =>
    names[id] ?? (candidates.find((c) => c.user_id === id) ? fullName(candidates.find((c) => c.user_id === id)!) : "Compañero");

  async function save() {
    if (!user) return;
    if (!win.isOpen) { toast.error("La votación está cerrada"); return; }
    if (voteId) { toast.error("Ya votaste esta semana: el voto es único"); return; }
    if (!nominee) { toast.error("Elige al compañero que mejor entrenó"); return; }
    if (nominee === user.id) { toast.error("No puedes votarte a ti mismo"); return; }
    const c = comment.trim();
    if (c.length < 10) { toast.error("El comentario es obligatorio: explica en pocas palabras por qué lo votas"); return; }
    setSaving(true);
    // Doble verificación contra la base: evita votos duplicados al recargar o reabrir el enlace
    const { data: existing } = await supabase
      .from("weekly_votes")
      .select("id")
      .eq("voter_id", user.id)
      .eq("week_start", weekStart)
      .maybeSingle();
    if (existing) {
      setVoteId(existing.id);
      setSaving(false);
      toast.error("Ya votaste esta semana");
      load();
      return;
    }
    const { data, error } = await supabase
      .from("weekly_votes")
      .insert({ voter_id: user.id, nominee_id: nominee, week_start: weekStart, comment: c })
      .select("id, week_start, nominee_id, comment, created_at")
      .single();
    if (error) {
      const dup = (error as any).code === "23505" || /duplicate|unique/i.test(error.message);
      toast.error(dup ? "Ya votaste esta semana: el voto es único" : error.message);
      setSaving(false);
      if (dup) load();
      return;
    }
    setVoteId(data.id);
    setMyVote(data);
    setJustVoted(true);
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
              Y por participar votando ganas <strong>1 punto</strong>. No puedes votarte a ti mismo.
            </p>
            <p className="text-xs mt-2">
              Votación abierta del <strong>viernes 19:00</strong> al <strong>domingo 22:00</strong>. Solo puedes votar <strong>una vez</strong> y no se puede cambiar.
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

      {!win.isOpen ? (
        <div className="border-2 border-dashed border-border p-6 mb-6 text-center">
          <p className="font-display text-base uppercase tracking-wide">
            {win.before ? "La votación abre el viernes a las 19:00" : "La votación de esta semana ya cerró"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {win.before
              ? "Hasta entonces no se puede votar. Tendrás hasta el domingo a las 22:00."
              : "Cerró el domingo a las 22:00. La próxima abre el viernes a las 19:00."}
          </p>
          {voteId && (
            <p className="text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Tu voto de esta semana quedó registrado.
            </p>
          )}
        </div>
      ) : voteId ? (
        <div className="border-2 border-black p-5 mb-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            <h3 className="font-display text-base uppercase tracking-wide">
              {justVoted ? "¡Voto confirmado!" : "Ya votaste esta semana"}
            </h3>
          </div>
          <dl className="mt-3 divide-y divide-border border border-border">
            <div className="flex items-center justify-between px-3 py-2">
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">Compañero elegido</dt>
              <dd className="text-sm font-medium">{myVote ? nomineeName(myVote.nominee_id) : "—"}</dd>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">Fecha del voto</dt>
              <dd className="text-sm tabular-nums">
                {myVote ? new Date(myVote.created_at).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" }) : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">Semana</dt>
              <dd className="text-sm tabular-nums">{fmtDate(weekStart)} – {fmtDate(weekEnd)}</dd>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">Puntos otorgados</dt>
              <dd className="text-sm">+7 a tu compañero · +1 para ti por participar</dd>
            </div>
          </dl>
          {myVote?.comment && (
            <p className="text-xs text-muted-foreground mt-3">Tu comentario: “{myVote.comment}”</p>
          )}
          <p className="text-xs text-muted-foreground mt-2">El voto es <strong>único</strong> y no se puede modificar.</p>
        </div>

      ) : (
      <div className="border border-border p-6 mb-6">
        <Label htmlFor="nominee" className="text-xs uppercase tracking-wider">Tu voto</Label>
        <Select value={nominee} onValueChange={setNominee} disabled={!win.isOpen || !!voteId}>
          <SelectTrigger id="nominee" className="mt-2 w-full h-11 text-sm rounded-none border-black">
            <SelectValue placeholder="Seleccioná al compañero que mejor entrenó" />
          </SelectTrigger>
          <SelectContent className="rounded-none border-black max-h-[260px]">
            {candidates.length === 0 ? (
              <SelectItem value="__empty__" disabled>Todavía no hay compañeros para votar</SelectItem>
            ) : (
              Object.entries(
                candidates.reduce((acc, c) => {
                  const group = c.position || "Sin posición";
                  (acc[group] ||= []).push(c);
                  return acc;
                }, {} as Record<string, Candidate[]>)
              ).sort(([a], [b]) => a.localeCompare(b))
                .map(([group, list]) => (
                  <SelectGroup key={group}>
                    <SelectLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">{group}</SelectLabel>
                    {list.map((c) => (
                      <SelectItem key={c.user_id} value={c.user_id}>
                        {fullName(c)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))
            )}
          </SelectContent>
        </Select>

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

        <Button onClick={save} disabled={saving || !nominee} className="w-full mt-4" size="lg">
          {saving ? "Guardando..." : "Votar (una sola vez)"}
        </Button>
      </div>
      )}


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
