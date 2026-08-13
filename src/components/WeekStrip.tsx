import { weekDays, DAY_LABELS, isoDate } from "@/lib/week-utils";
import { Check, Lock } from "lucide-react";

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
  /** Days (iso) that can be viewed but no longer edited (e.g. 48h window expired). */
  lockedDates?: Set<string>;
  /** Smaller cells (useful when only one day is selectable). */
  compact?: boolean;
  label?: string;
}

export function WeekStrip({ completed, selected, onSelect, showPreviousWeek, previousCompleted, allowedIndices, hideDisabled, lockedDates, compact, label }: Props) {
  const days = weekDays();
  const today = isoDate(new Date());

  const prevDays = showPreviousWeek
    ? (() => { const d = new Date(); d.setDate(d.getDate() - 7); return weekDays(d); })()
    : [];

  const isAllowed = (i: number) => !allowedIndices || allowedIndices.includes(i);
  const visible = days.map((iso, i) => ({ iso, i })).filter(({ i }) => !hideDisabled || isAllowed(i));

  const cell = compact ? "h-14 w-full max-w-[92px]" : "aspect-square";

  return (
    <div className="border border-border p-3 mb-4">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">{label ?? "Semana actual · click para ver/editar"}</p>
      <div
        className={compact ? "flex flex-wrap gap-1" : "grid grid-cols-7 gap-1"}
      >
        {visible.map(({ iso, i }) => {
          const done = completed.has(iso);
          const isSel = iso === selected;
          const isToday = iso === today;
          const allowed = isAllowed(i);
          const locked = allowed && lockedDates?.has(iso);
          return (
            <button
              key={iso}
              type="button"
              disabled={!allowed}
              onClick={() => allowed && onSelect(iso)}
              title={!allowed ? "Sin entrenamiento programado" : locked ? "Plazo vencido · solo lectura" : undefined}
              className={`relative ${cell} flex flex-col items-center justify-center border text-xs transition ${
                !allowed ? "bg-zinc-800 text-zinc-500 border-zinc-800 cursor-not-allowed"
                : isSel ? "bg-primary text-primary-foreground border-primary"
                : done ? "bg-emerald-500 text-white border-emerald-500"
                : locked ? "bg-white text-muted-foreground border-dashed border-border"
                : isToday ? "bg-white border-primary" : "bg-white border-border hover:bg-accent"
              }`}
            >
              <span className="text-[10px] opacity-80">{DAY_LABELS[i]}</span>
              <span className="font-display text-sm">{Number(iso.slice(-2))}</span>
              {done && !isSel && <Check className="absolute top-0.5 right-0.5 h-2.5 w-2.5" />}
              {locked && !done && <Lock className="absolute top-0.5 right-0.5 h-2.5 w-2.5" />}
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
