import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Flame, ChevronDown, Vote, Medal } from "lucide-react";
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
  vote_seconds: number;
  vote_thirds: number;
  votes_cast: number;
  points: number;
};

const W = { present: 3, form: 1, streak: 2, convo: 4, top5: 5, pos3: 3, voteWin: 7, voteSecond: 5, voteThird: 3, voteCast: 1 };

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function fullName(r: Row) {
  return `${r.full_name ?? ""}${r.last_name ? ` ${r.last_name}` : ""}`.trim() || "Atleta";
}

function breakdown(r: Row) {
  return [
    { label: "Presentes", count: r.present_days, per: W.present },
    { label: "Formularios", count: r.forms_count, per: W.form },
    { label: "Semanas de racha", count: r.streak_weeks, per: W.streak },
    { label: "Convocatorias", count: r.convocations, per: W.convo },
    { label: "Top 5 del equipo en tests", count: r.test_top5_count, per: W.top5 },
    { label: "Top 3 de su puesto en tests", count: r.test_pos_top3_count, per: W.pos3 },
    { label: "Más votado de la semana", count: r.vote_wins ?? 0, per: W.voteWin },
    { label: "2º más votado de la semana", count: r.vote_seconds ?? 0, per: W.voteSecond },
    { label: "3º más votado de la semana", count: r.vote_thirds ?? 0, per: W.voteThird },
    { label: "Semanas en que votó", count: r.votes_cast ?? 0, per: W.voteCast },
  ].map((x) => ({ ...x, total: x.count * x.per }));
}

function ranges() {
  const now = new Date();
  const y = now.getFullYear();
  return {
    mes: {
      from: isoDate(new Date(y, now.getMonth(), 1)),
      to: isoDate(new Date(y, now.getMonth() + 1, 0)),
      label: MONTHS[now.getMonth()],
    },
    temporada: { from: `${y}-01-01`, to: `${y}-12-31`, label: `Temporada ${y}` },
  };
}

export function CoachLeaderboard() {
  const [scope, setScope] = useState<"mes" | "temporada">("mes");
  const [data, setData] = useState<Record<string, Row[]>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [positionFilter, setPositionFilter] = useState("all");
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
      setLoading(false);
    })();
  }, [R]);

  const all = data[scope] ?? [];
  const positions = Array.from(new Set(all.map((r) => r.position).filter(Boolean) as string[])).sort();
  const rows = positionFilter === "all" ? all : all.filter((r) => r.position === positionFilter);
  const maxPoints = all[0]?.points || 1;

  if (loading) return <p className="text-sm text-muted-foreground">Cargando ranking…</p>;

  return (
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
              {scope === "mes" ? `Ranking mensual · ${R.mes.label}` : R.temporada.label}
            </p>
            <h2 className="font-display text-lg sm:text-xl uppercase tracking-wide mt-0.5">
              Tabla de posiciones · {rows.length} atletas
            </h2>
            <p className="text-[11px] text-muted-foreground mt-1">
              {W.present} pts por presente · {W.form} pt por formulario · {W.streak} pts por semana de racha ·{" "}
              {W.convo} pts por convocatoria · {W.top5} pts por top 5 del equipo en un test ·{" "}
              {W.pos3} pts por top 3 de su puesto · {W.voteWin}/{W.voteSecond}/{W.voteThird} pts según el podio de la
              votación semanal · {W.voteCast} pt por votar cada semana.
            </p>

            {positions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {["all", ...positions].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPositionFilter(p)}
                    className={`text-[11px] px-2 py-0.5 border border-black ${
                      positionFilter === p ? "bg-black text-white" : "hover:bg-accent"
                    }`}
                  >
                    {p === "all" ? "Todos los puestos" : p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 border border-border divide-y divide-border">
          {rows.map((r, i) => {
            const isOpen = expanded === r.user_id;
            return (
              <div key={r.user_id}>
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : r.user_id)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left"
                >
                  <span className="w-7 font-display text-xs">{i + 1}º</span>
                  <span className="flex-1 min-w-0">
                    <span className="block truncate">{fullName(r)}</span>
                    {r.position && (
                      <span className="block text-[10px] text-muted-foreground truncate">{r.position}</span>
                    )}
                    <span className="mt-1 block h-1.5 bg-secondary border border-border">
                      <span
                        className="block h-full bg-black"
                        style={{ width: `${Math.max(3, Math.round((r.points / maxPoints) * 100))}%` }}
                      />
                    </span>
                  </span>
                  {r.streak_weeks > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[10px]">
                      <Flame className="h-3 w-3" />
                      {r.streak_weeks}
                    </span>
                  )}
                  {(r.vote_wins ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[10px]">
                      <Vote className="h-3 w-3" />
                      {r.vote_wins}
                    </span>
                  )}
                  {r.test_top5_count > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[10px]">
                      <Medal className="h-3 w-3" />
                      {r.test_top5_count}
                    </span>
                  )}
                  <span className="font-display text-sm tabular-nums">{r.points}</span>
                  <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    {breakdown(r).map((b) => (
                      <div key={b.label} className="flex items-baseline justify-between gap-2">
                        <span className="truncate">
                          {b.label} ×{b.count}
                        </span>
                        <span className="tabular-nums font-semibold text-foreground">{b.total}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {rows.length === 0 && (
            <p className="px-3 py-4 text-sm text-muted-foreground">Sin datos para este período.</p>
          )}
        </div>
      </div>
    </section>
  );
}
