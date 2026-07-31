// Weekly readiness classification from questionnaires (RPE + wellness) and load ratios.
// Coach-only output: 3 categories.

export type ReadinessLevel = "green" | "amber" | "red";

export const READINESS_META: Record<
  ReadinessLevel,
  { label: string; bg: string; text: string; border: string }
> = {
  green: {
    label: "PUEDE ENTRENAR NORMAL",
    bg: "bg-emerald-500",
    text: "text-white",
    border: "border-emerald-600",
  },
  amber: {
    label: "SE RECOMIENDA ESTAR ATENTO",
    bg: "bg-amber-400",
    text: "text-black",
    border: "border-amber-500",
  },
  red: {
    label: "BAJARLE LAS CARGAS SÍ O SÍ",
    bg: "bg-red-600",
    text: "text-white",
    border: "border-red-700",
  },
};

export interface ReadinessInput {
  weeklyLoad: number; // sum of RPE this week
  chronicWeekly: number; // avg weekly load over last 4 weeks
  acwr: number | null;
  avgFatigue: number | null; // 1 best - 5 worst
  avgWellness: number | null; // avg of sleep/stress/fatigue/soreness
  hasPain: boolean;
  wellnessCount: number;
  rpeCount: number;
}

export interface ReadinessResult {
  level: ReadinessLevel;
  reasons: string[];
}

export function classifyReadiness(i: ReadinessInput): ReadinessResult {
  const red: string[] = [];
  const amber: string[] = [];

  if (i.acwr != null && i.acwr > 1.5) red.push(`ACWR ${i.acwr} (riesgo alto)`);
  else if (i.acwr != null && (i.acwr > 1.3 || i.acwr < 0.8))
    amber.push(`ACWR ${i.acwr} fuera del rango óptimo`);

  if (i.avgFatigue != null && i.avgFatigue >= 4) red.push(`Fatiga media ${i.avgFatigue}/5`);
  else if (i.avgFatigue != null && i.avgFatigue >= 3) amber.push(`Fatiga media ${i.avgFatigue}/5`);

  if (i.avgWellness != null && i.avgWellness >= 4) red.push(`Bienestar medio ${i.avgWellness}/5`);
  else if (i.avgWellness != null && i.avgWellness >= 3.2)
    amber.push(`Bienestar medio ${i.avgWellness}/5`);

  if (i.hasPain) red.push("Reportó dolor o molestia esta semana");

  if (i.wellnessCount === 0 && i.rpeCount === 0) amber.push("Sin datos esta semana");
  else if (i.wellnessCount === 0) amber.push("Sin cuestionarios de bienestar");
  else if (i.rpeCount === 0) amber.push("Sin registros de RPE");

  if (red.length) return { level: "red", reasons: red.concat(amber) };
  if (amber.length) return { level: "amber", reasons: amber };
  return { level: "green", reasons: ["Carga y bienestar dentro de rango"] };
}
