import { savePushSubscription, removePushSubscription, sendTestPush } from "@/lib/push.functions";
import { ensureServiceWorker } from "@/lib/notifications";

// Clave pública VAPID (es pública por diseño).
export const VAPID_PUBLIC_KEY =
  "BFmGhrQf2YZ0kYI5a4xoJehDB1ssduuFsdhL0XzIPXNe0T9kXT6cvIxvOw-POYig2pxuHgupjyM8wFsbPSI1Yuw";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function bufToBase64Url(buf: ArrayBuffer | null) {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function getExistingPushSubscription() {
  if (!pushSupported()) return null;
  const reg = await ensureServiceWorker();
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

/** Pide permiso, se suscribe al servicio de push del navegador y guarda la suscripción. */
export async function enableWebPush(): Promise<{ ok: boolean; reason?: string }> {
  if (!pushSupported()) return { ok: false, reason: "unsupported" };
  const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, reason: perm };

  const reg = await ensureServiceWorker();
  if (!reg) return { ok: false, reason: "no-sw" };
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  await savePushSubscription({
    data: {
      endpoint: sub.endpoint,
      p256dh: bufToBase64Url(sub.getKey("p256dh")),
      auth: bufToBase64Url(sub.getKey("auth")),
      userAgent: navigator.userAgent,
    },
  });

  return { ok: true };
}

export async function disableWebPush() {
  const sub = await getExistingPushSubscription();
  if (!sub) return;
  await removePushSubscription({ data: { endpoint: sub.endpoint } });
  await sub.unsubscribe();
}

export async function testWebPush() {
  return sendTestPush({});
}
