import type { Database } from "@/integrations/supabase/types";

export type GymRecord = Database["public"]["Tables"]["gym_observations"]["Row"];

export const exerciseKey = (name: string) => name.trim().toLocaleLowerCase("es");

export function groupGymRecords(items: GymRecord[]) {
  const groups = new Map<string, { name: string; records: GymRecord[] }>();
  for (const item of items) {
    const key = exerciseKey(item.exercise);
    const group = groups.get(key) ?? { name: item.exercise, records: [] };
    group.records.push(item);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export function previousGymRecord(items: GymRecord[], exercise: string, week: number, editingId?: string) {
  return items
    .filter((item) => exerciseKey(item.exercise) === exerciseKey(exercise) && item.id !== editingId && (item.week ?? 1) <= week)
    .sort((a, b) => (b.week ?? 1) - (a.week ?? 1) || b.created_at.localeCompare(a.created_at))[0];
}