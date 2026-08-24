import { createFileRoute } from "@tanstack/react-router";

const TZ = "Europe/Madrid";

function nowInTz() {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  const weekdayMap: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  return {
    weekday: weekdayMap[parts.weekday as string] ?? 0,
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(":");
  return Number(h) * 60 + Number(m ?? 0);
}

/** Detecta el tipo de recordatorio a partir del enlace o el título. */
function kindOf(s: { link?: string | null; title?: string | null }): "wellness" | "rpe" | "voto" | null {
  const hay = `${s.link ?? ""} ${s.title ?? ""}`.toLowerCase();
  if (hay.includes("votacion") || hay.includes("votación") || hay.includes("voto")) return "voto";
  if (hay.includes("wellness") || hay.includes("bienestar")) return "wellness";
  if (hay.includes("rpe") || hay.includes("esfuerzo")) return "rpe";
  return null;
}

async function run() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendPushToUsers, userIdsByRole } = await import("@/lib/push.server");
  const { weekday, dateKey, minutes } = nowInTz();

  /** Quita a los atletas que ya completaron el formulario correspondiente. */
  async function filterPending(kind: "wellness" | "rpe" | null, ids: string[]) {
    if (!kind || !ids.length) return ids;

    if (kind === "wellness") {
      const { data } = await supabaseAdmin
        .from("wellness_entries")
        .select("user_id")
        .eq("entry_date", dateKey)
        .in("user_id", ids);
      const done = new Set((data ?? []).map((r) => r.user_id));
      return ids.filter((id) => !done.has(id));
    }

    // RPE: la última sesión de entrenamiento del calendario (hasta hoy)
    const { data: events } = await supabaseAdmin
      .from("calendar_events")
      .select("event_date")
      .eq("type", "training")
      .lte("event_date", dateKey)
      .order("event_date", { ascending: false })
      .limit(1);
    const sessionDate = events?.[0]?.event_date;
    if (!sessionDate) return ids;

    const { data } = await supabaseAdmin
      .from("rpe_entries")
      .select("user_id")
      .eq("session_date", sessionDate)
      .in("user_id", ids);
    const done = new Set((data ?? []).map((r) => r.user_id));
    return ids.filter((id) => !done.has(id));
  }

  const { data: schedules, error } = await supabaseAdmin
    .from("push_schedules")
    .select("*")
    .eq("active", true);
  if (error) throw new Error(error.message);

  const results: Array<{ id: string; sent: number }> = [];

  for (const s of schedules ?? []) {
    if (!(s.weekdays ?? []).includes(weekday)) continue;
    if (timeToMinutes(s.send_time as unknown as string) > minutes) continue;
    if (s.last_sent_at) {
      const already = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(s.last_sent_at));
      if (already === dateKey) continue;
    }

    const role = (s.target_role ?? "atleta") as "atleta" | "coach";
    const allIds = await userIdsByRole(role);
    const ids = role === "atleta" ? await filterPending(kindOf(s), allIds) : allIds;
    if (!ids.length) {
      await supabaseAdmin.from("push_schedules").update({ last_sent_at: new Date().toISOString() }).eq("id", s.id);
      results.push({ id: s.id, sent: 0 });
      continue;
    }
    const res = await sendPushToUsers(ids, {
      title: s.title,
      body: s.body,
      link: s.link,
      tag: `sched-${s.id}-${dateKey}`,
    });
    await supabaseAdmin.from("push_schedules").update({ last_sent_at: new Date().toISOString() }).eq("id", s.id);
    results.push({ id: s.id, sent: res.sent });
  }

  return results;
}

export const Route = createFileRoute("/api/public/hooks/push-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PUSH_CRON_SECRET"];
        const provided = request.headers.get("x-cron-secret");
        if (!secret || provided !== secret) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        try {
          const results = await run();
          return new Response(JSON.stringify({ ok: true, results }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
