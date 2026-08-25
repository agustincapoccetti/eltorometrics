import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Trophy, Flame, ChevronRight, ChevronDown, Medal, Users, Vote } from "lucide-react";
import { isoDate } from "@/lib/week-utils";

type Row = {
  user_id: string;
  full_name: string | null;
  last_name: string | null;
  photo_url: string | null;
  position: string | null;
  present_days: number;
  forms_count: number;
  streak_weeks: number;
  convocations: number;
  test_top5_count: number;
  test_pos_top3_count: number;
  vote_wins: number;
  votes_cast: number;
  points: number;
};

/** Valores de puntos por concepto (deben coincidir con gamification_leaderboard). */
const W = { present: 3, form: 1, streak: 2, convo: 4, top5: 5, pos3: 3, voteWin: 7, voteCast: 1 };

function name(r: Row) {
  return `${r.full_name ?? ""}${r.last_name ? ` ${r.last_name}` : ""}`.trim() || "Atleta";
}
function shortName(r: Row) {
  const first = (r.full_name ?? "").trim().split(" ")[0] ?? "";
  const ap = (r.last_name ?? "").trim().split(" ")[0] ?? "";
  return [first, ap].filter(Boolean).join(" ") || "Atleta";
}

const MEDALS = ["1º", "2º", "3º"];

function breakdown(r: Row) {
  return [
    { label: "Presentes", count: r.present_days, per: W.present },
    { label: "Formularios", count: r.forms_count, per: W.form },
    { label: "Semanas de racha", count: r.streak_weeks, per: W.streak },
    { label: "Convocatorias", count: r.convocations, per: W.convo },
    { label: "Top 5 del equipo en tests", count: r.test_top5_count, per: W.top5 },
    { label: "Top 3 de tu puesto en tests", count: r.test_pos_top3_count, per: W.pos3 },
    { label: "Mejor de la semana (votación)", count: r.vote_wins ?? 0, per: W.voteWin },
    { label: "Semanas en que votaste", count: r.votes_cast ?? 0, per: W.voteCast },
  ].map((x) => ({ ...x, total: x.count * x.per }));
}

function phrase(rank: number, total: number, gap: number, ahead: Row | null, streak: number): string {
  if (total <= 1) return "Cada presente que sumes empieza a construir tu temporada.";
  if (rank === 1) return "Estás al frente. Mantenerlo es la parte difícil.";
  if (gap === 0 && ahead) return `Empatado con ${shortName(ahead)}. El próximo entrenamiento desempata.`;
  if (gap <= 3 && ahead) return `A ${gap} ${gap === 1 ? "punto" : "puntos"} de ${shortName(ahead)}. Un presente y lo pasas.`;
  if (rank <= 3) return "Estás en el podio. Falta poco para el escalón de arriba.";
  if (streak >= 3) return `Racha de ${streak} semanas. Así se recuperan posiciones.`;
  return `Te faltan ${gap} puntos para entrar en el top ${Math.max(3, rank - 1)}. Se recorta entrenando.`;
}

/** Desglose plegable: hay que desplegarlo para verlo. */
function BreakdownToggle({ r, invert }: { r: Row; invert?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider ${invert ? "text-white/80" : "text-muted-foreground"}`}
      >
        {open ? "Ocultar desglose" : "Ver desglose de puntos"}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className={`mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] ${invert ? "text-white/80" : "text-muted-foreground"}`}>
          {breakdown(r).map((b) => (
            <div key={b.label} className="flex items-baseline justify-between gap-2">
              <span className="truncate">{b.label} ×{b.count}</span>
              <span className={`tabular-nums font-semibold ${invert ? "text-white" : "text-foreground"}`}>{b.total}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function ranges() {
  const now = new Date();
  const y = now.getFullYear();
  const monthFrom = isoDate(new Date(y, now.getMonth(), 1));
  const monthTo = isoDate(new Date(y, now.getMonth() + 1, 0));
  return {
    mes: { from: monthFrom, to: monthTo, label: `${MONTHS[now.getMonth()]}` },
    temporada: { from: `${y}-01-01`, to: `${y}-12-31`, label: `Temporada ${y}` },
  };
}

export function AttendanceRace({ userId }: { userId: string }) {
  const [scope, setScope] = useState<"mes" | "temporada">("mes");
  const [data, setData] = useState<Record<string, Row[]>>({});
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const R = useMemo(ranges, []);

  useEffect(() => {
    (async () => {
      for (const key of ["mes", "temporada"] as const) {
        const { data: rows, error } = await supabase.rpc("gamification_leaderboard" as any, {
          _from: R[key].from,
          _to: R[key].to,
        } as any);
        if (!error) setData((d) => ({ ...d, [key]: (rows as unknown as Row[]) ?? [] }));
      }
    })();
  }, [R]);

  const rows = data[scope];
  if (!rows) return null;
  const hasAny = (data["mes"]?.length ?? 0) > 0 || (data["temporada"]?.length ?? 0) > 0;
  if (!hasAny) return null;

  const idx = rows.findIndex((r) => r.user_id === userId);
  const me = idx >= 0 ? rows[idx] : null;
  const rank = idx + 1;
  const ahead = idx > 0 ? rows[idx - 1] : null;
  const gap = me && ahead ? ahead.points - me.points : 0;
  const podium = rows.slice(0, 3);
  const leader = rows[0];
  const maxPoints = leader?.points || 1;

  return (
    <>
      <section className="border-2 border-black">
        <div className="flex gap-1 border-b-2 border-black p-1">
          {(["mes", "temporada"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                scope === s ? "bg-black text-white" : "hover:bg-accent"
              }`}
            >
              {s === "mes" ? `Mes · ${R.mes.label}` : "Temporada"}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <Trophy className="h-5 w-5 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {scope === "mes" ? `Ranking mensual · premio de ${R.mes.label}` : "Ranking de la temporada"}
              </p>

              {me ? (
                <>
                  <h2 className="font-display text-lg sm:text-xl uppercase tracking-wide mt-0.5">
                    {rank}º de {rows.length} · {me.points} pts
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {phrase(rank, rows.length, gap, ahead, me.streak_weeks)}
                  </p>

                  <div className="mt-3 h-2 bg-secondary border border-border">
                    <div
                      className="h-full bg-black"
                      style={{ width: `${Math.max(4, Math.round((me.points / maxPoints) * 100))}%` }}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {podium.map((p, i) => (
                      <span
                        key={p.user_id}
                        className={`text-[11px] px-2 py-0.5 border border-black ${p.user_id === userId ? "bg-black text-white" : ""}`}
                      >
                        {MEDALS[i]} {shortName(p)} · {p.points}
                      </span>
                    ))}
                  </div>

                  <BreakdownToggle r={me} />

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    {me.streak_weeks > 0 && (
                      <span className="inline-flex items-center gap-1 text-foreground">
                        <Flame className="h-3 w-3" />{me.streak_weeks} sem. de racha
                      </span>
                    )}
                    {me.test_top5_count > 0 && (
                      <span className="inline-flex items-center gap-1 text-foreground">
                        <Medal className="h-3 w-3" />{me.test_top5_count} top 5
                      </span>
                    )}
                    {me.test_pos_top3_count > 0 && (
                      <span className="inline-flex items-center gap-1 text-foreground">
                        <Users className="h-3 w-3" />{me.test_pos_top3_count} top 3 de puesto
                      </span>
                    )}
                    {(me.vote_wins ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1 text-foreground">
                        <Vote className="h-3 w-3" />{me.vote_wins} veces el mejor de la semana
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <h2 className="font-display text-lg uppercase tracking-wide mt-0.5">Todavía sin puntos</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {leader
                      ? `Tu primer presente te mete en la tabla. Lidera ${shortName(leader)} con ${leader.points} pts.`
                      : "Tu primer presente te mete en la tabla."}
                  </p>
                </>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider"
                >
                  Ver tabla completa <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <Link
                  to="/atleta/votacion"
                  className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider underline"
                >
                  <Vote className="h-3.5 w-3.5" /> Votar al mejor de la semana
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ranking · {scope === "mes" ? R.mes.label : R.temporada.label}</DialogTitle>
            <DialogDescription>
              {W.present} pts por presente · {W.form} pt por formulario · {W.streak} pts por semana de racha ·{" "}
              {W.convo} pts por convocatoria · {W.top5} pts por top 5 del equipo en un test ·{" "}
              {W.pos3} pts por top 3 de tu puesto · {W.voteWin} pts extra si eres el más votado de la semana ·{" "}
              {W.voteCast} pt por votar cada semana. Toca a un jugador para desplegar sus puntos.
            </DialogDescription>
          </DialogHeader>
          <div className="border border-border divide-y divide-border">
            {rows.map((r, i) => {
              const isMe = r.user_id === userId;
              const isOpen = expanded === r.user_id;
              return (
                <div key={r.user_id} className={isMe ? "bg-black text-white" : ""}>
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : r.user_id)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left"
                  >
                    <span className="w-7 font-display text-xs">{i + 1}º</span>
                    <span className="flex-1 min-w-0 truncate">
                      {name(r)}
                      {r.position && (
                        <span className={`ml-2 text-[10px] ${isMe ? "text-white/70" : "text-muted-foreground"}`}>
                          {r.position}
                        </span>
                      )}
                    </span>
                    {r.streak_weeks > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[10px]">
                        <Flame className="h-3 w-3" />{r.streak_weeks}
                      </span>
                    )}
                    <span className="font-display text-sm tabular-nums">{r.points}</span>
                    <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3">
                      <BreakdownToggle r={r} invert={isMe} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
