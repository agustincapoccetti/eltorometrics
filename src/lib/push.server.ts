// Server-only: envío real de Web Push (VAPID) compatible con el runtime edge.
import { buildPushPayload } from "@block65/webcrypto-web-push";

export interface PushPayload {
  title: string;
  body?: string | null;
  link?: string | null;
  tag?: string;
}

function vapid() {
  return {
    subject: process.env["VAPID_SUBJECT"] ?? "mailto:admin@eltorometrics.lovable.app",
    publicKey: process.env["VAPID_PUBLIC_KEY"],
    privateKey: process.env["VAPID_PRIVATE_KEY"],
  };
}

/**
 * Envía una notificación push a todos los dispositivos registrados de los usuarios dados.
 * Limpia automáticamente las suscripciones caducadas (404/410).
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  if (!userIds.length) return { sent: 0, removed: 0 };
  const keys = vapid();
  if (!keys.publicKey || !keys.privateKey) {
    console.warn("[push] VAPID keys no configuradas");
    return { sent: 0, removed: 0 };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: subs, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", userIds);
  if (error) throw new Error(error.message);
  if (!subs?.length) return { sent: 0, removed: 0 };

  const message = {
    data: {
      title: payload.title,
      body: payload.body ?? "",
      link: payload.link ?? "/",
      ...(payload.tag ? { tag: payload.tag } : {}),
    },
    options: { ttl: 60 * 60 * 12 },
  } as const;

  let sent = 0;
  const stale: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        const sub = {
          endpoint: s.endpoint,
          expirationTime: null,
          keys: { p256dh: s.p256dh, auth: s.auth },
        };
        const init = await buildPushPayload(message, sub, keys);
        const res = await fetch(s.endpoint, init as RequestInit);
        if (res.status === 404 || res.status === 410) {
          stale.push(s.id);
        } else if (res.ok) {
          sent += 1;
        } else {
          console.warn("[push] fallo", res.status, await res.text().catch(() => ""));
        }
      } catch (e) {
        console.warn("[push] error enviando", e);
      }
    }),
  );

  if (stale.length) {
    await supabaseAdmin.from("push_subscriptions").delete().in("id", stale);
  }

  return { sent, removed: stale.length };
}

export async function userIdsByRole(role: "atleta" | "coach") {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", role);
  return (data ?? []).map((r) => r.user_id);
}
