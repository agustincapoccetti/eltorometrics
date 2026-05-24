import { supabase } from "@/integrations/supabase/client";

export type NotifKind = "rpe" | "wellness" | "recuperacion" | "fisio" | "gym" | "info";

export interface CreateNotifInput {
  user_ids: string[];
  title: string;
  body?: string;
  link?: string;
  kind?: NotifKind;
  created_by?: string;
}

export async function createNotifications(input: CreateNotifInput) {
  if (!input.user_ids.length) return;
  const rows = input.user_ids.map((user_id) => ({
    user_id,
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
    kind: input.kind ?? "info",
    created_by: input.created_by ?? null,
  }));
  await supabase.from("notifications").insert(rows);
}

export async function notifyAllAthletes(input: Omit<CreateNotifInput, "user_ids">) {
  const { data } = await supabase.from("user_roles").select("user_id").eq("role", "atleta");
  const ids = (data ?? []).map((r) => r.user_id);
  await createNotifications({ ...input, user_ids: ids });
}

// Browser push (best-effort). No service worker — works only while app is open / on supported browsers.
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "default") {
    try { return await Notification.requestPermission(); } catch { return "denied"; }
  }
  return Notification.permission;
}

export function tryShowPush(title: string, body?: string) {
  try {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon: "/icon-192.png" });
    }
  } catch { /* best-effort */ }
}
