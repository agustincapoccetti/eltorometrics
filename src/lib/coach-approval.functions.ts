import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ADMIN_EMAIL = "agustincapoccetti@hotmail.com";

function assertAdmin(context: any) {
  const email = (context.claims?.email ?? "").toLowerCase();
  if (email !== ADMIN_EMAIL) throw new Error("No autorizado. Solo el administrador puede validar coaches.");
}

export const listCoachApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("coach_applications")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const decideCoachApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; decision: "approved" | "rejected"; coachType?: string }) => {
    if (!data?.userId) throw new Error("userId requerido");
    if (data.decision !== "approved" && data.decision !== "rejected") throw new Error("Decisión inválida");
    return { userId: data.userId, decision: data.decision, coachType: data.coachType };
  })
  .handler(async ({ data, context }) => {
    assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: app, error: appErr } = await supabaseAdmin
      .from("coach_applications")
      .select("*")
      .eq("user_id", data.userId)
      .maybeSingle();
    if (appErr) throw new Error(appErr.message);
    if (!app) throw new Error("Solicitud no encontrada");

    const coachType = data.coachType ?? app.coach_type;

    if (data.decision === "approved") {
      const { data: existing } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", data.userId)
        .eq("role", "coach")
        .maybeSingle();
      if (!existing) {
        const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: "coach" });
        if (error) throw new Error(error.message);
      }
      await supabaseAdmin.from("profiles").update({ coach_type: coachType }).eq("id", data.userId);
    } else {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", "coach");
    }

    const { error: updErr } = await supabaseAdmin
      .from("coach_applications")
      .update({
        status: data.decision,
        coach_type: coachType,
        decided_at: new Date().toISOString(),
        decided_by: context.userId,
      })
      .eq("user_id", data.userId);
    if (updErr) throw new Error(updErr.message);

    return { ok: true };
  });
