import { weekDays, DAY_LABELS, isoDate } from "@/lib/week-utils";
import { Check } from "lucide-react";

interface Props {
  completed: Set<string>;
  selected: string;
  onSelect: (iso: string) => void;
  /** Optional: also show last week as disabled so users see why they can't edit. */
  showPreviousWeek?: boolean;
  previousCompleted?: Set<string>;
  /** Optional: only these weekday indices (0 = Mon ... 6 = Sun) are selectable. */
  allowedIndices?: number[];
  /** Hide non-allowed days entirely instead of showing them disabled. */
  hideDisabled?: boolean;
  label?: string;
}

export function WeekStrip({ completed, selected, onSelect, showPreviousWeek, previousCompleted, allowedIndices, hideDisabled, label }: Props) {
  const days = weekDays();
  const today = isoDate(new Date());

  const prevDays = showPreviousWeek
    ? (() => { const d = new Date(); d.setDate(d.getDate() - 7); return weekDays(d); })()
    : [];

  const isAllowed = (i: number) => !allowedIndices || allowedIndices.includes(i);
  const visible = days.map((iso, i) => ({ iso, i })).filter(({ i }) => !hideDisabled || isAllowed(i));

  return (
    <div className="border border-border p-3 mb-4">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">{label ?? "Semana actual · click para ver/editar"}</p>
      <div className={`grid gap-1 ${hideDisabled ? "grid-cols-" + Math.min(visible.length, 7) : "grid-cols-7"}`} style={hideDisabled ? { gridTemplateColumns: `repeat(${Math.min(visible.length, 7)}, minmax(0, 1fr))` } : undefined}>
        {visible.map(({ iso, i }) => {
          const done = completed.has(iso);
          const isSel = iso === selected;
          const isToday = iso === today;
          const allowed = isAllowed(i);
          return (
            <button
              key={iso}
              type="button"
              disabled={!allowed}
              onClick={() => allowed && onSelect(iso)}
              className={`relative aspect-square flex flex-col items-center justify-center border text-xs transition ${
                !allowed ? "border-border opacity-40 cursor-not-allowed"
                : isSel ? "bg-primary text-primary-foreground border-primary"
                : done ? "bg-emerald-500 text-white border-emerald-500"
                : isToday ? "border-primary" : "border-border hover:bg-accent"
              }`}
            >
              <span className="text-[10px] opacity-80">{DAY_LABELS[i]}</span>
              <span className="font-display text-sm">{Number(iso.slice(-2))}</span>
              {done && !isSel && <Check className="absolute top-0.5 right-0.5 h-2.5 w-2.5" />}
            </button>
          );
        })}
      </div>

      {showPreviousWeek && (
        <>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-3 mb-2">Semana anterior · solo lectura</p>
          <div className="grid grid-cols-7 gap-1 opacity-60">
            {prevDays.map((iso, i) => {
              const done = previousCompleted?.has(iso);
              return (
                <div key={iso} className={`aspect-square flex flex-col items-center justify-center border text-xs ${done ? "bg-emerald-500/40 border-emerald-500/40" : "border-border"}`}>
                  <span className="text-[10px]">{DAY_LABELS[i]}</span>
                  <span className="font-display text-sm">{Number(iso.slice(-2))}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
