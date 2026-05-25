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

// Service worker registration (best-effort)
let swReg: ServiceWorkerRegistration | null = null;
export async function ensureServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  if (swReg) return swReg;
  try {
    swReg = await navigator.serviceWorker.register("/sw.js");
    return swReg;
  } catch { return null; }
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  await ensureServiceWorker();
  if (Notification.permission === "default") {
    try { return await Notification.requestPermission(); } catch { return "denied"; }
  }
  return Notification.permission;
}

export function getPushPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function tryShowPush(title: string, body?: string, link?: string) {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    const reg = await ensureServiceWorker();
    if (reg && reg.showNotification) {
      reg.showNotification(title, { body, icon: "/icon-192.png", badge: "/icon-192.png", data: { link } });
    } else {
      new Notification(title, { body, icon: "/icon-192.png" });
    }
  } catch { /* best-effort */ }
}
