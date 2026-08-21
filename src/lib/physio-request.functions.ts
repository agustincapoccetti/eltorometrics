import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Aviso al cuerpo técnico (fisios y preparadores físicos) cuando un atleta
 * solicita una cita por fuera de los turnos abiertos/recurrentes.
 * Lo dispara el propio atleta, así que la escritura se hace con privilegios.
 */
export const notifyPhysioRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { appointmentType: string; appointmentDate: string; reasons?: string[]; notes?: string | null }) => {
      if (!data?.appointmentDate || !data?.appointmentType) throw new Error("Datos incompletos");
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendPushToUsers } = await import("@/lib/push.server");

    const { data: me } = await supabaseAdmin
      .from("profiles")
      .select("full_name, last_name")
      .eq("id", context.userId)
      .maybeSingle();
    const athlete = [me?.full_name, me?.last_name].filter(Boolean).join(" ").trim() || "Un atleta";

    const { data: coachRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "coach");
    const coachIds = (coachRoles ?? []).map((r) => r.user_id);
    if (!coachIds.length) return { notified: 0 };

    const { data: staff } = await supabaseAdmin
      .from("profiles")
      .select("id, coach_type")
      .in("id", coachIds)
      .in("coach_type", ["fisio", "preparador_fisico"]);
    const targets = (staff ?? []).map((s) => s.id);
    if (!targets.length) return { notified: 0 };

    const typeLabel =
      data.appointmentType === "fisio_club"
        ? "Fisio en club"
        : data.appointmentType === "fisio_externo"
          ? "Fisio externo"
          : data.appointmentType === "presoterapia"
            ? "Botas de presoterapia"
            : data.appointmentType;

    const title = "Nueva solicitud de cita de fisio";
    const bodyParts = [`${athlete} · ${typeLabel} · ${data.appointmentDate}`];
    if (data.reasons?.length) bodyParts.push(`Motivos: ${data.reasons.join(", ")}`);
    if (data.notes) bodyParts.push(data.notes);
    const body = bodyParts.join(" — ");
    const link = "/coach/fisio";

    await supabaseAdmin.from("notifications").insert(
      targets.map((user_id) => ({
        user_id,
        title,
        body,
        link,
        kind: "fisio",
        created_by: context.userId,
      })),
    );

    const res = await sendPushToUsers(targets, { title, body, link, tag: "fisio-request" });
    return { notified: targets.length, ...res };
  });
