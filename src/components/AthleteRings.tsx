import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Gauge } from "@/components/Gauge";
import { isoDate, weekDays, isTodayOrPast } from "@/lib/week-utils";

type Metrics = {
  complianceDone: number;
  complianceExpected: number;
  wellnessAvg: number | null;
  fatigueAvg: number | null;
  acute: number;
  chronic: number;
  acwr: number | null;
};

const GREEN = "#10b981";
const LIME = "#84cc16";
const AMBER = "#f59e0b";
const ORANGE = "#f97316";
const RED = "#dc2626";
const SKY = "#38bdf8";
const SLATE = "#94a3b8";

function wellnessHex(avg: number | null) {
  if (avg == null) return SLATE;
  if (avg <= 1.5) return GREEN;
  if (avg <= 2.5) return LIME;
  if (avg <= 3.2) return AMBER;
  if (avg <= 4) return ORANGE;
  return RED;
}
function acwrHex(a: number | null) {
  if (a == null) return SLATE;
  if (a < 0.8) return SKY;
  if (a <= 1.3) return GREEN;
  if (a <= 1.5) return AMBER;
  return RED;
}

export function AthleteRings({ userId }: { userId: string }) {
  const [m, setM] = useState<Metrics | null>(null);

  useEffect(() => {
    (async () => {
      const today = isoDate(new Date());
      const week = weekDays();
      const from = (() => { const d = new Date(); d.setDate(d.getDate() - 27); return isoDate(d); })();
      const last7 = (() => { const d = new Date(); d.setDate(d.getDate() - 6); return isoDate(d); })();

      const [{ data: rpe }, { data: wel }, { data: evs }] = await Promise.all([
        supabase.from("rpe_entries").select("session_date, rpe_score").eq("user_id", userId).gte("session_date", from),
        supabase.from("wellness_entries").select("entry_date, sleep, stress, fatigue, mood").eq("user_id", userId).gte("entry_date", from),
        supabase.from("calendar_events").select("event_date, type").eq("type", "training").gte("event_date", week[0]).lte("event_date", week[6]),
      ]);

      const rpeRows = rpe ?? [];
      const welRows = wel ?? [];

      const trainings = (evs ?? []).map((e: any) => e.event_date).filter((d: string) => isTodayOrPast(d));
      const rpeDates = new Set(rpeRows.map((r: any) => r.session_date));
      const monday = week[0];
      let expected = trainings.length + (isTodayOrPast(monday) ? 1 : 0);
      let done = trainings.filter((d) => rpeDates.has(d)).length + (welRows.some((w: any) => w.entry_date === monday) ? 1 : 0);

      const recentWel = welRows.filter((w: any) => w.entry_date >= last7);
      const wellnessAvg = recentWel.length
        ? +(recentWel.reduce((s: number, w: any) => s + (w.sleep + w.stress + w.fatigue + w.mood) / 4, 0) / recentWel.length).toFixed(1)
        : null;
      const fatigueAvg = recentWel.length
        ? +(recentWel.reduce((s: number, w: any) => s + w.fatigue, 0) / recentWel.length).toFixed(1)
        : null;

      const acute = rpeRows.filter((r: any) => r.session_date >= week[0] && r.session_date <= today)
        .reduce((s: number, r: any) => s + r.rpe_score, 0);
      const chronic = +(rpeRows.reduce((s: number, r: any) => s + r.rpe_score, 0) / 4).toFixed(1);
      const acwr = chronic > 0 ? +(acute / chronic).toFixed(2) : null;

      setM({ complianceDone: done, complianceExpected: expected, wellnessAvg, fatigueAvg, acute, chronic, acwr });
    })();
  }, [userId]);

  if (!m) return null;

  const compPct = m.complianceExpected ? m.complianceDone / m.complianceExpected : 0;
  const loadMax = Math.max(m.acute, m.chronic, 1);

  return (
    <section className="border-2 border-black p-4 sm:p-5">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Tus números</p>
      <div className="grid grid-cols-3 gap-3 sm:gap-4 md:grid-cols-5">
        <Gauge
          value={compPct}
          color={compPct >= 0.99 ? GREEN : compPct >= 0.6 ? AMBER : RED}
          label="Respuestas"
          center={`${m.complianceDone}/${m.complianceExpected}`}
          sub="semana"
        />
        <Gauge
          value={m.wellnessAvg == null ? 0 : (5 - m.wellnessAvg) / 4}
          color={wellnessHex(m.wellnessAvg)}
          label="Bienestar 7 días"
          center={m.wellnessAvg == null ? "—" : String(m.wellnessAvg)}
          sub="/5"
        />
        <Gauge
          value={m.fatigueAvg == null ? 0 : (5 - m.fatigueAvg) / 4}
          color={wellnessHex(m.fatigueAvg)}
          label="Índice de fatiga"
          center={m.fatigueAvg == null ? "—" : String(m.fatigueAvg)}
          sub="/5"
        />
        <Gauge
          value={m.acute / loadMax}
          color={ORANGE}
          label="Carga aguda"
          center={String(m.acute)}
          sub="ua sem."
        />
        <Gauge
          value={m.chronic / loadMax}
          color={SKY}
          label="Carga crónica"
          center={String(m.chronic)}
          sub="ua/sem."
        />
      </div>
      <div className="mt-4 flex items-center gap-3 border-t border-border pt-3">
        <Gauge
          value={m.acwr == null ? 0 : Math.min(1, m.acwr / 2)}
          color={acwrHex(m.acwr)}
          label="ACWR"
          center={m.acwr == null ? "—" : String(m.acwr)}
          size={80}
        />
        <p className="text-xs text-muted-foreground">
          {m.acwr == null
            ? "Carga aún sin datos suficientes: carga tus RPE para ver la relación aguda/crónica."
            : m.acwr < 0.8
              ? "Estás por debajo de tu carga habitual. Buen momento para sumar volumen."
              : m.acwr <= 1.3
                ? "Tu carga está en el rango óptimo. Mantén la constancia."
                : m.acwr <= 1.5
                  ? "Carga alta respecto a tu promedio. Cuida el descanso."
                  : "Carga muy por encima de tu promedio: riesgo de lesión, prioriza recuperación."}
        </p>
      </div>
    </section>
  );
}
