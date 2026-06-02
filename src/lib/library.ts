export const LIBRARY_CATEGORIES = [
  { v: "rugby", l: "Rugby", icon: "🏉" },
  { v: "gym", l: "Gym", icon: "🏋️" },
  { v: "fisio", l: "Fisio", icon: "🧑‍⚕️" },
] as const;

export function categoryLabel(v: string) {
  return LIBRARY_CATEGORIES.find((c) => c.v === v)?.l ?? v;
}
export function categoryIcon(v: string) {
  return LIBRARY_CATEGORIES.find((c) => c.v === v)?.icon ?? "•";
}
