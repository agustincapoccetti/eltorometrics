import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Trophy, Flame, ChevronRight } from "lucide-react";

type Row = {
  user_id: string;
  full_name: string | null;
  last_name: string | null;
  photo_url: string | null;
  position: string | null;
  present_days: number;
  forms_count: number;
  streak_weeks: number;
  points: number;
};

function name(r: Row) {
  return `${r.full_name ?? ""}${r.last_name ? ` ${r.last_name}` : ""}`.trim() || "Atleta";
}
function shortName(r: Row) {
  const first = (r.full_name ?? "").trim().split(" ")[0] ?? "";
  const ap = (r.last_name ?? "").trim().split(" ")[0] ?? "";
  return [first, ap].filter(Boolean).join(" ") || "Atleta";
}

const MEDALS = ["1º", "2º", "3º"];

/** Frases motivadoras según la situación en la carrera del presentismo */
function phrase(rank: number, total: number, gap: number, ahead: Row | null, streak: number): string {
  if (total <= 1) return "Cada presente que sumes empieza a construir tu temporada.";
  if (rank === 1) return "Estás al frente. Mantenerlo es la parte difícil.";
  if (gap === 0 && ahead) return `Empatado con ${shortName(ahead)}. El próximo entrenamiento desempata.`;
  if (gap <= 3 && ahead) return `A ${gap} ${gap === 1 ? "punto" : "puntos"} de ${shortName(ahead)}. Un presente y lo pasas.`;
  if (rank <= 3) return "Estás en el podio. Falta poco para el escalón de arriba.";
  if (streak >= 3) return `Racha de ${streak} semanas. Así se recuperan posiciones.`;
  return `Te faltan ${gap} puntos para entrar en el top ${Math.max(3, rank - 1)}. Se recorta entrenando.`;
}

export function AttendanceRace({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("attendance_leaderboard" as any, {} as any);
      if (error) { setRows([]); return; }
      setRows((data as unknown as Row[]) ?? []);
    })();
  }, []);

  if (!rows || rows.length === 0) return null;

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
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full text-left p-4 sm:p-5 hover:bg-accent transition-colors"
        >
          <div className="flex items-start gap-3">
            <Trophy className="h-5 w-5 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Carrera del presentismo</p>

              {me ? (
                <>
                  <h2 className="font-display text-lg sm:text-xl uppercase tracking-wide mt-0.5">
                    {rank}º de {rows.length} · {me.points} pts
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {phrase(rank, rows.length, gap, ahead, me.streak_weeks)}
                  </p>

                  {/* Barra de progreso contra el líder */}
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

                  <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>{me.present_days} presentes</span>
                    <span>{me.forms_count} formularios</span>
                    {me.streak_weeks > 0 && (
                      <span className="inline-flex items-center gap-1 text-foreground">
                        <Flame className="h-3 w-3" />{me.streak_weeks} sem. de racha
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <h2 className="font-display text-lg uppercase tracking-wide mt-0.5">Todavía sin puntos</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tu primer presente te mete en la tabla. Lidera {shortName(leader!)} con {leader!.points} pts.
                  </p>
                </>
              )}

              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider">
                Ver tabla completa <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </button>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Carrera del presentismo · Temporada</DialogTitle>
            <DialogDescription>
              3 pts por presente · 1 pt por formulario completado · 2 pts por semana de racha.
            </DialogDescription>
          </DialogHeader>
          <div className="border border-border divide-y divide-border">
            {rows.map((r, i) => (
              <div
                key={r.user_id}
                className={`flex items-center gap-3 px-3 py-2 text-sm ${r.user_id === userId ? "bg-black text-white" : ""}`}
              >
                <span className="w-7 font-display text-xs">{i + 1}º</span>
                <span className="flex-1 min-w-0 truncate">
                  {name(r)}
                  {r.position && <span className={`ml-2 text-[10px] ${r.user_id === userId ? "text-white/70" : "text-muted-foreground"}`}>{r.position}</span>}
                </span>
                {r.streak_weeks > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px]">
                    <Flame className="h-3 w-3" />{r.streak_weeks}
                  </span>
                )}
                <span className="font-display text-sm tabular-nums">{r.points}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
