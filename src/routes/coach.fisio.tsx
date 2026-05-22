import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Shell } from "@/components/Shell";
import { Protected } from "@/lib/protected";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Download, FileDown } from "lucide-react";
import { exportPdf } from "@/lib/pdf-export";

export const Route = createFileRoute("/coach/fisio")({
  component: () => <Protected requireRole="coach"><CoachPhysio /></Protected>,
});

function CoachPhysio() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const reasonsRef = useRef<HTMLDivElement>(null);
  const athletesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: appts } = await supabase.from("physio_appointments").select("*").order("appointment_date", { ascending: false });
      setAppointments(appts ?? []);
      const ids = Array.from(new Set((appts ?? []).map((a) => a.user_id)));
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name, last_name, position, photo_url").in("id", ids);
        const m: Record<string, any> = {};
        (profs ?? []).forEach((p) => { m[p.id] = p; });
        setProfiles(m);
      }
    })();
  }, []);

  const byAthlete = useMemo(() => {
    const map: Record<string, { id: string; name: string; position: string; total: number; attended: number; scheduled: number; cancelled: number }> = {};
    appointments.forEach((a) => {
      const p = profiles[a.user_id];
      const name = p ? `${p.full_name}${p.last_name ? " " + p.last_name : ""}` : a.user_id.slice(0, 8);
      const e = (map[a.user_id] ??= { id: a.user_id, name, position: p?.position ?? "—", total: 0, attended: 0, scheduled: 0, cancelled: 0 });
      e.total++;
      if (a.status === "attended") e.attended++;
      else if (a.status === "cancelled") e.cancelled++;
      else e.scheduled++;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [appointments, profiles]);

  const byReason = useMemo(() => {
    const counts: Record<string, number> = {};
    appointments.forEach((a) => (a.reasons ?? []).forEach((r: string) => { counts[r] = (counts[r] ?? 0) + 1; }));
    return Object.entries(counts).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
  }, [appointments]);

  async function downloadPdf() {
    await exportPdf({
      title: "Citas con fisioterapeuta",
      subtitle: `${appointments.length} citas totales · ${byAthlete.length} atletas`,
      chartEls: [reasonsRef.current!, athletesRef.current!].filter(Boolean),
      tables: [
        {
          title: "Por atleta",
          head: ["Atleta", "Puesto", "Total", "Asistidas", "Programadas", "Canceladas"],
          rows: byAthlete.map((a) => [a.name, a.position, a.total, a.attended, a.scheduled, a.cancelled]),
        },
        {
          title: "Por motivo",
          head: ["Motivo", "Frecuencia"],
          rows: byReason.map((r) => [r.reason, r.count]),
        },
        {
          title: "Detalle de citas",
          head: ["Fecha", "Atleta", "Estado", "Motivos", "Notas"],
          rows: appointments.map((a) => {
            const p = profiles[a.user_id];
            return [a.appointment_date, p ? `${p.full_name}${p.last_name ? " " + p.last_name : ""}` : "—", a.status, (a.reasons ?? []).join(" · "), a.notes ?? ""];
          }),
        },
      ],
      filename: `fisio_${new Date().toISOString().slice(0, 10)}.pdf`,
    });
  }

  return (
    <Shell title="Fisioterapia">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">Citas registradas por los atletas · análisis de motivos y frecuencia.</p>
        <Button onClick={downloadPdf}><FileDown className="h-4 w-4 mr-2" />PDF</Button>
      </div>

      <div className="grid md:grid-cols-3 gap-3 mb-8">
        <Stat label="Citas totales" value={appointments.length} />
        <Stat label="Atletas con citas" value={byAthlete.length} />
        <Stat label="Asistidas" value={appointments.filter((a) => a.status === "attended").length} />
      </div>

      <div ref={reasonsRef} className="border border-border p-6 mb-4 bg-background">
        <h2 className="text-xl mb-1">Motivos más frecuentes</h2>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Top motivos reportados</p>
        {byReason.length === 0 ? <p className="text-sm text-muted-foreground">Sin datos.</p> : (
          <ResponsiveContainer width="100%" height={Math.max(260, byReason.length * 22)}>
            <BarChart data={byReason.slice(0, 15)} layout="vertical" margin={{ top: 5, right: 20, left: 140, bottom: 5 }}>
              <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
              <XAxis type="number" stroke="#000" fontSize={11} allowDecimals={false} />
              <YAxis type="category" dataKey="reason" stroke="#000" fontSize={10} width={140} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #000", borderRadius: 0 }} />
              <Bar dataKey="count" fill="#000" name="Citas" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div ref={athletesRef} className="border border-border p-6 mb-4 bg-background">
        <h2 className="text-xl mb-1">Por atleta</h2>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Cantidad de citas por jugador</p>
        {byAthlete.length === 0 ? <p className="text-sm text-muted-foreground">Sin datos.</p> : (
          <>
            <ResponsiveContainer width="100%" height={Math.max(220, byAthlete.length * 26)}>
              <BarChart data={byAthlete} layout="vertical" margin={{ top: 5, right: 20, left: 120, bottom: 5 }}>
                <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
                <XAxis type="number" stroke="#000" fontSize={11} allowDecimals={false} />
                <YAxis type="category" dataKey="name" stroke="#000" fontSize={10} width={120} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #000", borderRadius: 0 }} />
                <Bar dataKey="total" fill="#000" name="Citas totales" />
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-6 border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary text-xs uppercase tracking-wider">
                  <tr><th className="p-2 text-left">Atleta</th><th className="p-2">Puesto</th><th className="p-2">Total</th><th className="p-2">Asistidas</th><th className="p-2">Programadas</th><th className="p-2">Canceladas</th></tr>
                </thead>
                <tbody>
                  {byAthlete.map((a) => (
                    <tr key={a.id} className="border-t border-border">
                      <td className="p-2"><Link to="/coach/atleta/$id" params={{ id: a.id }} className="hover:underline">{a.name}</Link></td>
                      <td className="p-2 text-center text-xs">{a.position}</td>
                      <td className="p-2 text-center font-medium">{a.total}</td>
                      <td className="p-2 text-center">{a.attended}</td>
                      <td className="p-2 text-center">{a.scheduled}</td>
                      <td className="p-2 text-center">{a.cancelled}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="border border-border p-6">
        <h2 className="text-xl mb-4">Últimas citas</h2>
        <div className="space-y-2">
          {appointments.slice(0, 20).map((a) => {
            const p = profiles[a.user_id];
            return (
              <div key={a.id} className="border-l-2 border-primary pl-3 py-1">
                <p className="text-sm">
                  <span className="font-display text-xs uppercase tracking-wider">{a.appointment_date}</span>
                  {" · "}
                  {p ? `${p.full_name}${p.last_name ? " " + p.last_name : ""}` : "—"}
                  <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">{a.status}</span>
                </p>
                <p className="text-xs text-muted-foreground">{(a.reasons ?? []).join(" · ")}</p>
                {a.notes && <p className="text-xs italic">{a.notes}</p>}
              </div>
            );
          })}
          {appointments.length === 0 && <p className="text-sm text-muted-foreground">Sin citas registradas.</p>}
        </div>
      </div>
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-3xl font-display mt-1">{value}</p>
    </div>
  );
}
