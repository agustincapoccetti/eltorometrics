import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { Protected } from "@/lib/protected";
import { supabase } from "@/integrations/supabase/client";
import { MonthCalendar } from "@/components/MonthCalendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Trophy, Dumbbell, Clock } from "lucide-react";

export const Route = createFileRoute("/atleta/calendario")({
  component: () => <Protected requireRole="atleta"><AthleteCalendar /></Protected>,
});

function AthleteCalendar() {
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [events, setEvents] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const start = new Date(month.getFullYear(), month.getMonth(), 1).toISOString().slice(0, 10);
      const end = new Date(month.getFullYear(), month.getMonth() + 1, 0).toISOString().slice(0, 10);
      const { data } = await supabase.from("calendar_events").select("*").gte("event_date", start).lte("event_date", end).order("event_date");
      setEvents(data ?? []);
    })();
  }, [month]);

  const dayEvents = selectedDate ? events.filter((e) => e.event_date === selectedDate) : [];

  return (
    <Shell title="Calendario">
      <p className="text-sm text-muted-foreground mb-6">Entrenamientos y partidos del equipo. Tocá un día para ver detalles.</p>
      <MonthCalendar
        month={month}
        events={events}
        onPrev={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
        onNext={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
        onDayClick={(d) => setSelectedDate(d)}
      />

      <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 border border-primary inline-block" /> Entrenamiento</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-primary inline-block" /> Partido</span>
      </div>

      <Dialog open={!!selectedDate} onOpenChange={(o) => !o && setSelectedDate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedDate && new Date(selectedDate + "T12:00").toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })}</DialogTitle>
            <DialogDescription>{dayEvents.length === 0 ? "Sin actividades programadas." : `${dayEvents.length} actividad(es)`}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {dayEvents.map((e) => (
              <div key={e.id} className="border border-border p-4">
                <div className="flex items-center gap-2 mb-1">
                  {e.type === "match" ? <Trophy className="h-4 w-4" /> : <Dumbbell className="h-4 w-4" />}
                  <p className="font-display text-sm uppercase tracking-wider">{e.type === "match" ? "Partido" : "Entrenamiento"}</p>
                </div>
                <h3 className="text-lg">{e.name}</h3>
                {(e.event_time || e.duration_minutes) && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3" />
                    {e.event_time?.slice(0, 5)}{e.event_time && e.duration_minutes ? " · " : ""}{e.duration_minutes ? `${e.duration_minutes} min` : ""}
                  </p>
                )}
                {e.description && <p className="text-sm mt-2 text-muted-foreground">{e.description}</p>}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
