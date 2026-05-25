export const APPOINTMENT_TYPES = [
  { v: "fisio_club", l: "Fisio en club", icon: "🏟️" },
  { v: "fisio_externo", l: "Fisio externo", icon: "🏥" },
  { v: "presoterapia", l: "Botas de presoterapia", icon: "🦵" },
] as const;

export type AppointmentTypeValue = typeof APPOINTMENT_TYPES[number]["v"];

export function typeLabel(v: string) {
  return APPOINTMENT_TYPES.find((t) => t.v === v)?.l ?? v;
}
export function typeIcon(v: string) {
  return APPOINTMENT_TYPES.find((t) => t.v === v)?.icon ?? "•";
}
