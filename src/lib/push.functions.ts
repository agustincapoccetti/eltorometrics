import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Guarda (o actualiza) la suscripción push del usuario autenticado. */
export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { endpoint: string; p256dh: string; auth: string; userAgent?: string }) => {
    if (!data?.endpoint || !data?.p256dh || !data?.auth) throw new Error("Suscripción incompleta");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("push_subscriptions").upsert(
      {
        user_id: context.userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        user_agent: data.userAgent ?? null,
      },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { endpoint: string }) => {
    if (!data?.endpoint) throw new Error("endpoint requerido");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", data.endpoint)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Envío de prueba al propio usuario. */
export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { sendPushToUsers } = await import("@/lib/push.server");
    return sendPushToUsers([context.userId], {
      title: "El Toro Rugby",
      body: "Notificaciones push activadas correctamente.",
      link: "/",
      tag: "test",
    });
  });

/** Envío manual/automático desde la app (coach o el propio sistema tras una acción del usuario). */
export const sendPushToTargets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { userIds?: string[]; role?: "atleta" | "coach"; title: string; body?: string; link?: string; tag?: string }) => {
      if (!data?.title) throw new Error("Título requerido");
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const { sendPushToUsers, userIdsByRole } = await import("@/lib/push.server");
    let ids = data.userIds ?? [];
    const targetsOthers = data.role != null || ids.some((id) => id !== context.userId);
    if (targetsOthers) {
      const { data: isCoach } = await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "coach",
      });
      if (!isCoach) throw new Error("Solo el cuerpo técnico puede enviar avisos a otros usuarios");
    }
    if (data.role) ids = await userIdsByRole(data.role);
    if (!ids.length) return { sent: 0, removed: 0 };
    return sendPushToUsers(ids, {
      title: data.title,
      body: data.body ?? null,
      link: data.link ?? null,
      ...(data.tag ? { tag: data.tag } : {}),
    });
  });
