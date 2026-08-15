import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { Protected } from "@/lib/protected";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { MonthCalendar } from "@/components/MonthCalendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Trophy, Dumbbell, Clock, MapPin, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { fmtDateLong, fmtTime } from "@/lib/format-date";
import { isoDate, startOfWeek } from "@/lib/week-utils";

export const Route = createFileRoute("/atleta/calendario")({
  head: () => ({
    meta: [
      { title: "Mi agenda · El Toro Rugby Performance" },
      { name: "description", content: "Entrenamientos y partidos del equipo: día, hora y duración. Tu agenda como jugador." },
      { property: "og:title", content: "Mi agenda · El Toro Rugby Performance" },
      { property: "og:description", content: "Entrenamientos y partidos del equipo: día, hora y duración." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <Protected requireRole="atleta"><AthleteAgenda /></Protected>,
});

type Ev = {
  id: string;
  event_date: string;
  event_time: string | null;
  duration_minutes: number | null;
  name: string;
  type: "training" | "match";
};

type MatchInfo = { match_date: string; opponent: string; location: string | null; convoked: boolean };

function AthleteAgenda() {
  const { user } = useAuth();
  const [view, setView] = useState<"week" | "month">("week");
  const [weekStart, setWeekStart] = useState(() => startOfWeek());
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [events, setEvents] = useState<Ev[]>([]);
  const [matches, setMatches] = useState<MatchInfo[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const today = isoDate(new Date());

  const range = useMemo(() => {
    if (view === "week") {
      const end = new Date(weekStart); end.setDate(weekStart.getDate() + 6);
      return { start: isoDate(weekStart), end: isoDate(end) };
    }
    const y = month.getFullYear(), m = month.getMonth();
    return {
      start: isoDate(new Date(y, m, 1)),
      end: isoDate(new Date(y, m + 1, 0)),
    };
  }, [view, weekStart, month]);

  useEffect(() => {
    (async () => {
      // Solo lo que necesita el jugador: qué hay, cuándo y cuánto dura.
      const { data } = await supabase
        .from("calendar_events")
        .select("id, event_date, event_time, duration_minutes, name, type")
        .gte("event_date", range.start).lte("event_date", range.end)
        .order("event_date").order("event_time", { nullsFirst: true });
      setEvents((data ?? []) as Ev[]);
    })();
  }, [range.start, range.end]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: mp } = await supabase
        .from("match_participations")
        .select("convoked, matches(match_date, opponent, location)")
        .eq("user_id", user.id);
      setMatches(
        ((mp ?? []) as any[])
          .filter((r) => r.matches)
          .map((r) => ({
            match_date: r.matches.match_date,
            opponent: r.matches.opponent,
            location: r.matches.location,
            convoked: r.convoked,
          })),
      );
    })();
  }, [user?.id]);

  const dayEvents = selectedDate ? events.filter((e) => e.event_date === selectedDate) : [];
  const convokedDates = new Set(matches.filter((m) => m.convoked).map((m) => m.match_date));
  const nextConvo = matches
    .filter((m) => m.convoked && m.match_date >= today)
    .sort((a, b) => a.match_date.localeCompare(b.match_date))[0];

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
    return d;
  });

  function shiftWeek(delta: number) {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + delta * 7); setWeekStart(d);
  }

  const weekLabel = `${weekDates[0].toLocaleDateString("es", { day: "numeric", month: "short" })} — ${weekDates[6].toLocaleDateString("es", { day: "numeric", month: "short" })}`;

  return (
    <Shell title="Agenda">
      <p className="text-sm text-muted-foreground mb-4">
        Entrenos y partidos del equipo. Toca un día para ver el detalle.
      </p>

      <div className="flex border-2 border-black mb-5">
        {(["week", "month"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 py-2 text-xs uppercase tracking-widest ${view === v ? "bg-black text-white" : "hover:bg-accent"}`}
          >
            {v === "week" ? "Semana" : "Mes"}
          </button>
        ))}
      </div>

      {nextConvo && (
        <div className="border-2 border-black bg-black text-white p-4 mb-5 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-white/70">Estás convocado</p>
            <p className="font-display text-lg uppercase tracking-wide">vs {nextConvo.opponent}</p>
            <p className="text-xs text-white/80">
              {fmtDateLong(nextConvo.match_date)}
              {nextConvo.location ? ` · ${nextConvo.location}` : ""}
            </p>
          </div>
        </div>
      )}

      {view === "week" ? (
        <section className="border-2 border-black">
          <div className="flex items-center justify-between border-b-2 border-black">
            <button onClick={() => shiftWeek(-1)} className="p-3 hover:bg-accent" aria-label="Semana anterior">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center">
              <p className="font-display text-sm uppercase tracking-wider">{weekLabel}</p>
              <button onClick={() => setWeekStart(startOfWeek())} className="text-[10px] uppercase tracking-widest text-muted-foreground hover:underline">
                Ir a esta semana
              </button>
            </div>
            <button onClick={() => shiftWeek(1)} className="p-3 hover:bg-accent" aria-label="Semana siguiente">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="divide-y divide-border">
            {weekDates.map((d) => {
              const iso = isoDate(d);
              const evs = events.filter((e) => e.event_date === iso);
              return (
                <button
                  key={iso}
                  onClick={() => evs.length && setSelectedDate(iso)}
                  className={`w-full text-left flex gap-3 px-3 py-3 ${iso === today ? "bg-accent/60" : ""} ${evs.length ? "hover:bg-accent" : ""}`}
                >
                  <div className="w-12 shrink-0">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {d.toLocaleDateString("es", { weekday: "short" })}
                    </p>
                    <p className="font-display text-xl leading-none tabular-nums">{d.getDate()}</p>
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    {evs.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Libre</p>
                    ) : (
                      evs.map((e) => (
                        <div key={e.id} className="flex items-center gap-2 min-w-0">
                          {e.type === "match" ? <Trophy className="h-3.5 w-3.5 shrink-0" /> : <Dumbbell className="h-3.5 w-3.5 shrink-0" />}
                          <span className="text-sm truncate flex-1">
                            {convokedDates.has(iso) && e.type === "match" ? "★ " : ""}{e.name}
                          </span>
                          <span className="text-xs tabular-nums text-muted-foreground shrink-0">
                            {e.event_time ? fmtTime(e.event_time) : "—"}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        <MonthCalendar
          month={month}
          events={events}
          onPrev={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          onNext={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          onDayClick={(d) => setSelectedDate(d)}
          renderDay={(iso, evs) => (
            <div className="space-y-0.5">
              {evs.slice(0, 3).map((e) => (
                <div
                  key={e.id}
                  className={`text-[10px] truncate px-1 py-0.5 ${e.type === "match" ? "bg-primary text-primary-foreground" : "border border-primary"}`}
                >
                  {e.type === "match" ? (convokedDates.has(iso) ? "★ " : "⚑ ") : ""}{e.name}
                </div>
              ))}
              {evs.length > 3 && <div className="text-[10px] text-muted-foreground">+{evs.length - 3}</div>}
            </div>
          )}
        />
      )}

      <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Dumbbell className="h-3 w-3" /> Entrenamiento</span>
        <span className="flex items-center gap-1"><Trophy className="h-3 w-3" /> Partido</span>
        <span>★ partido con tu convocatoria</span>
      </div>

      <Dialog open={!!selectedDate} onOpenChange={(o) => !o && setSelectedDate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedDate ? fmtDateLong(selectedDate) : ""}</DialogTitle>
            <DialogDescription>
              {dayEvents.length === 0 ? "Sin actividades programadas." : `${dayEvents.length} actividad(es)`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {dayEvents.map((e) => {
              const convo = matches.find((m) => m.match_date === e.event_date && m.convoked);
              return (
                <div key={e.id} className="border border-border p-4">
                  <div className="flex items-center gap-2 mb-1">
                    {e.type === "match" ? <Trophy className="h-4 w-4" /> : <Dumbbell className="h-4 w-4" />}
                    <p className="font-display text-sm uppercase tracking-wider">
                      {e.type === "match" ? "Partido" : "Entrenamiento"}
                    </p>
                  </div>
                  <h3 className="text-lg">{e.name}</h3>
                  {(e.event_time || e.duration_minutes) && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />
                      {e.event_time ? fmtTime(e.event_time) : ""}
                      {e.event_time && e.duration_minutes ? " · " : ""}
                      {e.duration_minutes ? `${e.duration_minutes} min` : ""}
                    </p>
                  )}
                  {e.type === "match" && convo && (
                    <p className="text-xs mt-2 inline-flex items-center gap-1 border border-black px-2 py-0.5">
                      <CheckCircle2 className="h-3 w-3" /> Convocado
                      {convo.location && (
                        <span className="inline-flex items-center gap-1 ml-1 text-muted-foreground">
                          <MapPin className="h-3 w-3" />{convo.location}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
