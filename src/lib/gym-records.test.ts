import { describe, expect, test } from "bun:test";
import { groupGymRecords, previousGymRecord, type GymRecord } from "./gym-records";

const record = (id: string, exercise: string, week: number, weight: number): GymRecord => ({
  id, exercise, week, weight, reps: 8, done: true, notes: null,
  user_id: "athlete", routine_id: "routine", created_at: `2026-11-${id.padStart(2, "0")}T12:00:00Z`, updated_at: "2026-11-01T12:00:00Z",
});

describe("Gym history", () => {
  test("groups repeated exercise names regardless of spaces and capitalization", () => {
    const groups = groupGymRecords([record("1", "Sentadilla", 1, 80), record("2", " sentadilla ", 2, 85), record("3", "Remo", 1, 30)]);
    expect(groups).toHaveLength(2);
    expect(groups.find((group) => group.name === "Sentadilla")?.records.map((item) => item.weight)).toEqual([80, 85]);
  });
  test("previous load excludes future weeks and the record being edited", () => {
    const records = [record("1", "Sentadilla", 1, 80), record("2", "Sentadilla", 2, 85), record("3", "Sentadilla", 3, 90)];
    expect(previousGymRecord(records, "Sentadilla", 2)?.weight).toBe(85);
    expect(previousGymRecord(records, "Sentadilla", 2, "2")?.weight).toBe(80);
    expect(previousGymRecord(records, "Remo", 2)).toBeUndefined();
  });
});