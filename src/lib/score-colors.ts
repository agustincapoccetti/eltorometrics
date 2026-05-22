// Functional color indicators (exception to B&W theme) for athlete metrics.
// Tailwind arbitrary colors so they're not theme-bound.

export function rpeColor(score: number) {
  // 0-3 green · 4-6 amber · 7-8 orange · 9-10 red
  if (score <= 3) return { bg: "bg-emerald-500", text: "text-white", label: "Bajo" };
  if (score <= 6) return { bg: "bg-amber-400", text: "text-black", label: "Moderado" };
  if (score <= 8) return { bg: "bg-orange-500", text: "text-white", label: "Alto" };
  return { bg: "bg-red-600", text: "text-white", label: "Máximo" };
}

// Wellness uses inverted scale: 1 best · 5 worst
export function wellnessColor(score: number) {
  if (score <= 1) return { bg: "bg-emerald-500", text: "text-white", label: "Excelente" };
  if (score <= 2) return { bg: "bg-lime-500", text: "text-black", label: "Bien" };
  if (score <= 3) return { bg: "bg-amber-400", text: "text-black", label: "Regular" };
  if (score <= 4) return { bg: "bg-orange-500", text: "text-white", label: "Mal" };
  return { bg: "bg-red-600", text: "text-white", label: "Muy mal" };
}

export function acwrColor(acwr: number | null) {
  if (acwr == null) return { bg: "bg-secondary", text: "text-muted-foreground", label: "—" };
  if (acwr < 0.8) return { bg: "bg-sky-400", text: "text-black", label: "Baja" };
  if (acwr <= 1.3) return { bg: "bg-emerald-500", text: "text-white", label: "Óptima" };
  if (acwr <= 1.5) return { bg: "bg-amber-400", text: "text-black", label: "Alta" };
  return { bg: "bg-red-600", text: "text-white", label: "Riesgo" };
}

export function fatigueColor(avg: number | null) {
  if (avg == null) return "bg-secondary text-muted-foreground";
  if (avg <= 2) return "bg-emerald-500 text-white";
  if (avg <= 3) return "bg-amber-400 text-black";
  if (avg <= 4) return "bg-orange-500 text-white";
  return "bg-red-600 text-white";
}
