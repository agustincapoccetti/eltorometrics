import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isoDate, startOfWeek, endOfWeek } from "@/lib/week-utils";

type Athlete = { id: string; name: string };

export function PanelSummary() {
  const [risk, setRisk] = useState<{ a: Athlete; acwr: number }[]>([]);
  const [missingWellness, setMissingWellness] = useState<Athlete[]>([]);
  const [missingRpe, setMissingRpe] = useState<Athlete[]>([]);
  const [total, setTotal] = useState(0);
  const [lastSession, setLastSession] = useState<{ name: string; date: string } | null>(null);
  const [physioReq, setPhysioReq] = useState<any[]>([]);
  const [coachReq, setCoachReq] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const today = isoDate(new Date());
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
        supabase.from("wellness_entries").select("user_id, entry_date").in("user_id", ids).eq("entry_date", today),
        supabase.from("calendar_events").select("name, event_date, type").eq("type", "training").lte("event_date", today).order("event_date", { ascending: false }).limit(1),
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

      const ev = (events ?? [])[0] as any;
      if (ev) {
        setLastSession({ name: ev.name, date: ev.event_date });
        const rSet = new Set((rpe ?? []).filter((r: any) => r.session_date === ev.event_date).map((r: any) => r.user_id));
        setMissingRpe(list.filter((a) => !rSet.has(a.id)));
      } else {
        setLastSession(null);
        setMissingRpe([]);
      }
    })();
  }, []);

  const pct = (missing: number) => (total ? Math.round(((total - missing) / total) * 100) : 0);

  return (
    <section className="grid gap-3 md:grid-cols-3 mb-10">
      <Card title="Riesgo esta semana" subtitle={`${risk.length} en zona de riesgo (ACWR)`}>
        {risk.length === 0 ? (
          <Empty>Sin jugadores en riesgo</Empty>
        ) : (
          <ul className="space-y-1">
            {risk.map(({ a, acwr }) => (
              <li key={a.id}>
                <Link to="/coach/atleta/$id" params={{ id: a.id }} className="flex items-center justify-between text-xs hover:underline">
                  <span className="truncate">{a.name}</span>
                  <span className="font-display ml-2">{acwr}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Compliance de hoy" subtitle={`${total} atletas`}>
        <div className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-wider">Bienestar hoy · <span className="font-display">{pct(missingWellness.length)}%</span></p>
            {missingWellness.length === 0 ? <Empty>Todos completaron</Empty> : (
              <>
                <MissingChips list={missingWellness} />
                <RemindButton
                  list={missingWellness}
                  title="Completa tu bienestar"
                  body="Todavía no registraste el cuestionario de bienestar de hoy."
                  link="/atleta/wellness"
                  tag="remind-wellness"
                />
              </>
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider">
              RPE {lastSession ? `· ${lastSession.name} (${lastSession.date})` : ""} · <span className="font-display">{lastSession ? `${pct(missingRpe.length)}%` : "—"}</span>
            </p>
            {!lastSession ? <Empty>Sin sesiones pasadas en el calendario</Empty>
              : missingRpe.length === 0 ? <Empty>Todos cargaron</Empty>
              : (
                <>
                  <MissingChips list={missingRpe} />
                  <RemindButton
                    list={missingRpe}
                    title="Carga tu RPE"
                    body={`Falta tu RPE de ${lastSession.name}.`}
                    link="/atleta/rpe"
                    tag="remind-rpe"
                  />
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
