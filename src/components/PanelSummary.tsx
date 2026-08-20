import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isoDate, startOfWeek, endOfWeek, weekDays, withinHoursAfter, isTodayOrPast } from "@/lib/week-utils";
import { sendPushToTargets } from "@/lib/push.functions";
import { toast } from "sonner";
import { BellRing, ChevronDown } from "lucide-react";

type Athlete = { id: string; name: string };

export function PanelSummary() {
  const [risk, setRisk] = useState<{ a: Athlete; acwr: number }[]>([]);
  const [missingWellness, setMissingWellness] = useState<Athlete[]>([]);
  const [sessions, setSessions] = useState<{ name: string; date: string; open: boolean; missing: Athlete[] }[]>([]);
  const [total, setTotal] = useState(0);


  const [wellnessDate, setWellnessDate] = useState(weekDays()[0]);
  const [wellnessOpen, setWellnessOpen] = useState(false);
  const [physioReq, setPhysioReq] = useState<any[]>([]);
  const [coachReq, setCoachReq] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const today = isoDate(new Date());
      const monday = weekDays()[0];
      const weekStart = isoDate(startOfWeek());
      const weekEnd = isoDate(endOfWeek());
      const chronicStart = (() => { const d = new Date(); d.setDate(d.getDate() - 27); return isoDate(d); })();

      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "atleta");
      const ids = (roles ?? []).map((r) => r.user_id);

      const [{ data: apps }, { data: capps }] = await Promise.all([
        supabase.from("physio_appointments").select("id, user_id, appointment_date, appointment_type, status").eq("status", "requested").order("appointment_date"),
        supabase.from("coach_applications").select("id, full_name, email, coach_type, status").eq("status", "pending"),
      ]);
      setPhysioReq(apps ?? []);
      setCoachReq(capps ?? []);

      if (!ids.length) { setTotal(0); return; }

      const [{ data: profiles }, { data: rpe }, { data: wellness }, { data: events }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, last_name").in("id", ids),
        supabase.from("rpe_entries").select("user_id, session_date, rpe_score").in("user_id", ids).gte("session_date", chronicStart),
        supabase.from("wellness_entries").select("user_id, entry_date").in("user_id", ids).eq("entry_date", monday),
        supabase.from("calendar_events").select("name, event_date, type").eq("type", "training").lte("event_date", today).order("event_date", { ascending: false }).limit(5),
      ]);

      const nameOf = (p: any) => `${p.full_name ?? ""}${p.last_name ? " " + p.last_name : ""}`.trim() || "Sin nombre";
      const list: Athlete[] = (profiles ?? []).map((p: any) => ({ id: p.id, name: nameOf(p) }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setTotal(list.length);

      const riskRows: { a: Athlete; acwr: number }[] = [];
      list.forEach((a) => {
        const mine = (rpe ?? []).filter((r: any) => r.user_id === a.id);
        const weekly = mine.filter((r: any) => r.session_date >= weekStart && r.session_date <= weekEnd)
          .reduce((s: number, r: any) => s + r.rpe_score, 0);
        const chronic = mine.reduce((s: number, r: any) => s + r.rpe_score, 0) / 4;
        if (chronic > 0) {
          const acwr = +(weekly / chronic).toFixed(2);
          if (acwr > 1.5 || acwr < 0.8) riskRows.push({ a, acwr });
        }
      });
      setRisk(riskRows.sort((x, y) => y.acwr - x.acwr));

      const wSet = new Set((wellness ?? []).map((w: any) => w.user_id));
      setMissingWellness(list.filter((a) => !wSet.has(a.id)));
      setWellnessDate(monday);
      setWellnessOpen(isTodayOrPast(monday) && withinHoursAfter(monday, 24));

      // Todas las sesiones pasadas cuya ventana de 48 hs sigue abierta (+ la última cerrada como referencia)
      const past = ((events ?? []) as any[]).filter((e) => isTodayOrPast(e.event_date));
      const openEvents = past.filter((e) => withinHoursAfter(e.event_date, 48));
      const shown = openEvents.length ? openEvents : past.slice(0, 1);
      setSessions(
        shown.map((ev) => {
          const rSet = new Set((rpe ?? []).filter((r: any) => r.session_date === ev.event_date).map((r: any) => r.user_id));
          return {
            name: ev.name,
            date: ev.event_date,
            open: withinHoursAfter(ev.event_date, 48),
            missing: list.filter((a) => !rSet.has(a.id)),
          };
        })
      );
    })();
  }, []);


  const pct = (missing: number) => (total ? Math.round(((total - missing) / total) * 100) : 0);

  return (
    <section className="grid gap-3 md:grid-cols-3 mb-10">
      <Card title="Riesgo esta semana" subtitle={`${risk.length} en zona de riesgo (ACWR)`}>
        {risk.length === 0 ? (
          <Empty>Sin jugadores en riesgo</Empty>
        ) : (
          <RiskList risk={risk} />
        )}
      </Card>


      <Card title="Compliance" subtitle={`${total} atletas`}>
        <div className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-wider">
              Bienestar · {wellnessDate} · <span className="font-display">{pct(missingWellness.length)}%</span>
              {!wellnessOpen && <span className="ml-1 text-muted-foreground">(cerrado)</span>}
            </p>
            {missingWellness.length === 0 ? <Empty>Todos completaron</Empty> : (
              <>
                <MissingChips list={missingWellness} />
                {wellnessOpen && (
                  <RemindButton
                    list={missingWellness}
                    title="Completa tu bienestar"
                    body={`Todavía no registraste el cuestionario de bienestar del ${wellnessDate}.`}
                    link="/atleta/wellness"
                    tag="remind-wellness"
                  />
                )}
              </>
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider">
              RPE {lastSession ? `· ${lastSession.name} (${lastSession.date})` : ""} · <span className="font-display">{lastSession ? `${pct(missingRpe.length)}%` : "—"}</span>
              {lastSession && !lastSession.open && <span className="ml-1 text-muted-foreground">(cerrado)</span>}
            </p>
            {!lastSession ? <Empty>Sin sesiones pasadas en el calendario</Empty>
              : missingRpe.length === 0 ? <Empty>Todos cargaron</Empty>
              : (
                <>
                  <MissingChips list={missingRpe} />
                  {lastSession.open && (
                    <RemindButton
                      list={missingRpe}
                      title="Carga tu RPE"
                      body={`Falta tu RPE de ${lastSession.name}.`}
                      link="/atleta/rpe"
                      tag="remind-rpe"
                    />
                  )}
                </>
              )}
          </div>
        </div>
      </Card>

      <Card title="Pendientes" subtitle={`${physioReq.length + coachReq.length} por resolver`}>
        {physioReq.length === 0 && coachReq.length === 0 ? (
          <Empty>Nada pendiente</Empty>
        ) : (
          <ul className="space-y-1">
            {physioReq.map((a) => (
              <li key={a.id}>
                <Link to="/coach/fisio" className="block text-xs hover:underline">
                  Cita solicitada · {a.appointment_date} · {a.appointment_type}
                </Link>
              </li>
            ))}
            {coachReq.map((c) => (
              <li key={c.id}>
                <Link to="/coach/coaches" className="block text-xs hover:underline">
                  Alta de coach · {c.full_name || c.email}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="border border-border p-4">
      <h3 className="text-xs uppercase tracking-widest text-muted-foreground">{title}</h3>
      {subtitle && <p className="text-lg font-display mb-2">{subtitle}</p>}
      {children}
    </div>
  );
}

function RiskList({ risk }: { risk: { a: Athlete; acwr: number }[] }) {
  const [open, setOpen] = useState(false);
  const shown = open ? risk : risk.slice(0, 3);
  return (
    <div>
      <ul className="space-y-1">
        {shown.map(({ a, acwr }) => (
          <li key={a.id}>
            <Link to="/coach/atleta/$id" params={{ id: a.id }} className="flex items-center justify-between text-xs hover:underline">
              <span className="truncate">{a.name}</span>
              <span className="font-display ml-2">{acwr}</span>
            </Link>
          </li>
        ))}
      </ul>
      {risk.length > 3 && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-2 inline-flex items-center gap-1 border border-border px-2 py-1 text-[11px] uppercase tracking-wider hover:bg-foreground hover:text-background"
        >
          {open ? "Ver menos" : `Ver ${risk.length - 3} más`}
          <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      )}
    </div>
  );
}


function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

function MissingChips({ list }: { list: Athlete[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? list : list.slice(0, 3);
  const rest = list.length - 3;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {visible.map((a) => (
        <Link
          key={a.id}
          to="/coach/atleta/$id"
          params={{ id: a.id }}
          className="border border-border px-2 py-0.5 text-[11px] leading-tight hover:bg-foreground hover:text-background"
        >
          {a.name}
        </Link>
      ))}
      {rest > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="border border-dashed border-border px-2 py-0.5 text-[11px] leading-tight text-muted-foreground hover:bg-foreground hover:text-background"
        >
          {expanded ? "Ver menos" : `+${rest} más`}
        </button>
      )}
    </div>
  );
}

function RemindButton({
  list,
  title,
  body,
  link,
  tag,
}: {
  list: Athlete[];
  title: string;
  body: string;
  link: string;
  tag: string;
}) {
  const [sending, setSending] = useState(false);
  async function send() {
    setSending(true);
    try {
      const res = await sendPushToTargets({
        data: { userIds: list.map((a) => a.id), title, body, link, tag: `${tag}-${isoDate(new Date())}` },
      });
      toast.success(`Recordatorio enviado a ${res.sent} dispositivo(s)`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  }
  return (
    <button
      type="button"
      onClick={send}
      disabled={sending}
      className="mt-2 inline-flex items-center gap-1 border border-border px-2 py-1 text-[11px] uppercase tracking-wider hover:bg-foreground hover:text-background disabled:opacity-50"
    >
      <BellRing className="h-3 w-3" />
      {sending ? "Enviando..." : `Recordar a ${list.length} pendiente${list.length === 1 ? "" : "s"}`}
    </button>
  );
}
