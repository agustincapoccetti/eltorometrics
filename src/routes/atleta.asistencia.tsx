import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Shell } from "@/components/Shell";
import { Protected } from "@/lib/protected";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";
import { fmtDate } from "@/lib/format-date";

type Search = { d?: string; r?: "si" | "no" };

function todayMadrid() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
}

export const Route = createFileRoute("/atleta/asistencia")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    d: typeof s.d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.d) ? s.d : undefined,
    r: s.r === "si" || s.r === "no" ? s.r : undefined,
  }),
  head: () => ({
    meta: [
      { title: "¿Viniste a entrenar? · El Toro Rugby Performance" },
      { name: "description", content: "Confirma si fuiste al entrenamiento de hoy para sumar en el presentismo." },
      { property: "og:title", content: "¿Viniste a entrenar? · El Toro Rugby Performance" },
      { property: "og:description", content: "Confirma si fuiste al entrenamiento de hoy para sumar en el presentismo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <Protected requireRole="atleta"><Asistencia /></Protected>,
});

function Asistencia() {
  const { d, r } = Route.useSearch();
  const date = d ?? todayMadrid();
  const [done, setDone] = useState<null | { present: boolean; locked: boolean }>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const auto = useRef(false);

  async function answer(present: boolean) {
    setBusy(true); setErr(null);
    const { data, error } = await supabase.rpc("self_report_attendance", { _date: date, _present: present });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setDone({ present, locked: data === "locked" });
  }

  useEffect(() => {
    if (r && !auto.current) { auto.current = true; answer(r === "si"); }
  }, [r]);

  return (
    <Shell>
      <div className="max-w-md mx-auto py-10 text-center space-y-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{fmtDate(date)}</p>
        <h1 className="text-3xl font-black uppercase">¿Viniste a entrenar hoy?</h1>
        {done ? (
          <div className="border-2 border-foreground p-6 space-y-3">
            {done.locked ? (
              <p className="text-sm">Tu presente de este día ya estaba registrado por el cuerpo técnico o por tu RPE.</p>
            ) : done.present ? (
              <><CheckCircle2 className="w-10 h-10 mx-auto" /><p className="font-bold">¡Presente registrado!</p></>
            ) : (
              <><XCircle className="w-10 h-10 mx-auto" /><p className="font-bold">Registramos que no fuiste.</p></>
            )}
            <Button asChild variant="outline" className="w-full"><Link to="/atleta">Volver a Hoy</Link></Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Button size="lg" className="h-20 text-2xl font-black" disabled={busy} onClick={() => answer(true)}>SÍ</Button>
            <Button size="lg" variant="outline" className="h-20 text-2xl font-black border-2 border-foreground" disabled={busy} onClick={() => answer(false)}>NO</Button>
          </div>
        )}
        {err && <p className="text-sm text-destructive">{err}</p>}
      </div>
    </Shell>
  );
}
