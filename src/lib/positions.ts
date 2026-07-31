// Canonical lists so everyone selects the same values (filterable, no typos).

export const POSITIONS = [
  "Pilar",
  "Hooker",
  "Segunda Línea",
  "Ala",
  "Octavo",
  "Medio Scrum",
  "Apertura",
  "Centro",
  "Wing",
  "Fullback",
] as const;

export type Position = (typeof POSITIONS)[number];

export const COACH_TYPES = [
  { value: "preparador_fisico", label: "Preparador físico" },
  { value: "fisio", label: "Fisio" },
  { value: "entrenador", label: "Entrenador" },
] as const;

export type CoachType = (typeof COACH_TYPES)[number]["value"];

export function coachTypeLabel(v?: string | null) {
  return COACH_TYPES.find((c) => c.value === v)?.label ?? "Coach";
}
