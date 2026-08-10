import type { ReactNode } from "react";
import { isoDate } from "@/lib/week-utils";

interface CalendarEvent {
  id: string;
  event_date: string; // YYYY-MM-DD
  name: string;
  type: "training" | "match";
}

export function MonthCalendar({
  month,
  events,
  onPrev,
  onNext,
  onDayClick,
  renderDay,
}: {
  month: Date;
  events: CalendarEvent[];
  onPrev: () => void;
  onNext: () => void;
  onDayClick?: (date: string) => void;
  renderDay?: (date: string, evs: CalendarEvent[]) => ReactNode;
}) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(year, m, 1);
  const startOffset = (first.getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push(iso);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const byDate: Record<string, CalendarEvent[]> = {};
  events.forEach((e) => { (byDate[e.event_date] ??= []).push(e); });

  const monthLabel = month.toLocaleDateString("es", { month: "long", year: "numeric" });
  const todayIso = isoDate(new Date());

  return (
    <div className="border border-border">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <button onClick={onPrev} className="px-3 py-1 text-xs uppercase tracking-wider hover:bg-accent">‹ Ant</button>
        <h3 className="font-display text-sm uppercase tracking-wider">{monthLabel}</h3>
        <button onClick={onNext} className="px-3 py-1 text-xs uppercase tracking-wider hover:bg-accent">Sig ›</button>
      </div>
      <div className="grid grid-cols-7 border-b border-border">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
          <div key={d} className="px-2 py-2 text-[10px] uppercase tracking-wider text-muted-foreground text-center border-r border-border last:border-r-0">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((iso, idx) => {
          const evs = iso ? (byDate[iso] ?? []) : [];
          const isToday = iso === todayIso;
          return (
            <button
              key={idx}
              type="button"
              disabled={!iso}
              onClick={() => iso && onDayClick?.(iso)}
              className={`min-h-[88px] border-r border-b border-border last:border-r-0 p-1.5 text-left align-top text-xs transition ${iso ? "hover:bg-accent" : "bg-secondary/30 cursor-default"} ${isToday ? "bg-accent" : ""}`}
            >
              {iso && (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-display text-[11px]">{Number(iso.slice(-2))}</span>
                  </div>
                  {renderDay ? renderDay(iso, evs) : (
                    <div className="space-y-0.5">
                      {evs.slice(0, 3).map((e) => (
                        <div key={e.id} className={`text-[10px] truncate px-1 py-0.5 ${e.type === "match" ? "bg-primary text-primary-foreground" : "border border-primary"}`}>
                          {e.type === "match" ? "⚑ " : ""}{e.name}
                        </div>
                      ))}
                      {evs.length > 3 && <div className="text-[10px] text-muted-foreground">+{evs.length - 3}</div>}
                    </div>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
