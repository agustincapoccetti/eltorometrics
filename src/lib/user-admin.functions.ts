import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ADMIN_EMAIL = "agustincapoccetti@hotmail.com";

async function assertAdmin(context: any) {
  const email = (context.claims?.email ?? "").toLowerCase();
  if (email !== ADMIN_EMAIL) throw new Error("No autorizado. Solo el administrador puede gestionar usuarios.");
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (authErr) throw new Error(authErr.message);

    const ids = authData.users.map((u) => u.id);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, position").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
    ]);

    const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const rMap = new Map((roles ?? []).map((r: any) => [r.user_id, r.role]));

    return authData.users
      .map((u) => ({
        id: u.id,
        email: u.email ?? "",
        created_at: u.created_at,
        confirmed: !!u.email_confirmed_at,
        last_sign_in_at: u.last_sign_in_at,
        full_name: (pMap.get(u.id) as any)?.full_name ?? "",
        position: (pMap.get(u.id) as any)?.position ?? "",
        role: rMap.get(u.id) ?? null,
      }))
      .sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email));
  });

export const inviteAthlete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { email: string; fullName?: string; position?: string }) => {
    const email = (data.email ?? "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Email inválido");
    return { email, fullName: (data.fullName ?? "").trim(), position: (data.position ?? "").trim() };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const request = (await import("@tanstack/react-start/server")).getRequest();
    const host = request?.headers.get("origin") ?? "";
    const redirectTo = host ? `${host.replace(/\/$/, "")}/reset-password` : undefined;

    const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      data: {
        full_name: data.fullName || "",
        position: data.position || null,
        role: "atleta",
      },
      redirectTo,
    });
    if (error) throw new Error(error.message);
    return { ok: true, userId: invited.user?.id };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => {
    if (!data?.userId) throw new Error("userId requerido");
    return { userId: data.userId };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("No puedes eliminar tu propio usuario.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; role: "atleta" | "coach"; coachType?: string }) => {
    if (!data?.userId) throw new Error("userId requerido");
    if (data.role !== "atleta" && data.role !== "coach") throw new Error("Rol inválido");
    const allowed = ["preparador_fisico", "fisio", "entrenador"];
    const coachType = data.coachType && allowed.includes(data.coachType) ? data.coachType : "preparador_fisico";
    return { userId: data.userId, role: data.role, coachType };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("No puedes cambiar tu propio rol.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error: rErr } = await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.role });
    if (rErr) throw new Error(rErr.message);

    if (data.role === "coach") {
      await supabaseAdmin.from("profiles").update({ coach_type: data.coachType, onboarded: true }).eq("id", data.userId);
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(data.userId);
      const { data: prof } = await supabaseAdmin.from("profiles").select("full_name").eq("id", data.userId).maybeSingle();
      const { data: existing } = await supabaseAdmin
        .from("coach_applications").select("id").eq("user_id", data.userId).maybeSingle();
      const payload = {
        status: "approved",
        coach_type: data.coachType,
        decided_at: new Date().toISOString(),
        decided_by: context.userId,
      };
      if (existing) {
        await supabaseAdmin.from("coach_applications").update(payload).eq("user_id", data.userId);
      } else {
        await supabaseAdmin.from("coach_applications").insert({
          user_id: data.userId,
          email: (u?.user?.email ?? "").toLowerCase(),
          full_name: prof?.full_name ?? "",
          ...payload,
        });
      }
    } else {
      await supabaseAdmin.from("profiles").update({ coach_type: null }).eq("id", data.userId);
      await supabaseAdmin.from("coach_applications").delete().eq("user_id", data.userId);
    }

    return { ok: true };
  });
