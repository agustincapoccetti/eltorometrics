import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { Protected } from "@/lib/protected";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Activity, Heart, Dumbbell, Stethoscope, CheckCircle2, BookOpen, Calendar as CalendarIcon, ArrowRight, ChevronDown } from "lucide-react";
import { isoDate } from "@/lib/week-utils";
import { fmtDateLong, fmtRelative, fmtTime } from "@/lib/format-date";
import { typeLabel, typeIcon } from "@/lib/appointment-types";

export const Route = createFileRoute("/atleta/")({
  head: () => ({
    meta: [
      { title: "Hoy · El Toro Rugby Performance" },
      { name: "description", content: "Tu resumen diario: bienestar, RPE, gimnasio y turnos de fisio en una sola pantalla." },
      { property: "og:title", content: "Hoy · El Toro Rugby Performance" },
      { property: "og:description", content: "Tu resumen diario: bienestar, RPE, gimnasio y turnos de fisio en una sola pantalla." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <Protected requireRole="atleta"><AthleteToday /></Protected>,
});

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function AthleteToday() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [wellnessDone, setWellnessDone] = useState(true);
  const [pendingRpe, setPendingRpe] = useState<any | null>(null);
  const [routine, setRoutine] = useState<any | null>(null);
  const [appt, setAppt] = useState<any | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [newWeight, setNewWeight] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = isoDate(new Date());

      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(p);
      if (p?.last_weight_update) {
        const days = (Date.now() - new Date(p.last_weight_update).getTime()) / 86400000;
        if (days >= 30) { setNewWeight(String(p.weight ?? "")); setShowWeightModal(true); }
      } else if (p) {
        setNewWeight(String(p.weight ?? "")); setShowWeightModal(true);
      }

      const { data: w } = await supabase
        .from("wellness_entries").select("id").eq("user_id", user.id).eq("entry_date", today).maybeSingle();
      setWellnessDone(!!w);

      // Última sesión de calendario ya pasada (hoy incluido) sin RPE cargado
      const { data: evs } = await supabase
        .from("calendar_events").select("*").lte("event_date", today)
        .order("event_date", { ascending: false }).limit(5);
      let pending: any = null;
      for (const ev of evs ?? []) {
        const { count } = await supabase
          .from("rpe_entries").select("id", { count: "exact", head: true })
          .eq("user_id", user.id).eq("session_date", ev.event_date);
        if (!count) { pending = ev; break; }
      }
      setPendingRpe(pending);

      // Rutina de gym del mes en curso para su puesto
      const now = new Date();
      const { data: rs } = await supabase
        .from("gym_routines").select("*")
        .eq("month", now.getMonth() + 1).eq("year", now.getFullYear());
      setRoutine((rs ?? []).find((r) => !r.position || r.position === p?.position) ?? null);

      // Turno de fisio en las próximas 48hs
      const in48 = new Date(); in48.setDate(in48.getDate() + 2);
      const { data: aps } = await supabase
        .from("physio_appointments").select("*").eq("user_id", user.id)
        .gte("appointment_date", today).lte("appointment_date", isoDate(in48))
        .neq("status", "cancelada")
        .order("appointment_date", { ascending: true }).limit(1);
      setAppt(aps?.[0] ?? null);

      setLoaded(true);
    })();
  }, [user]);

  async function saveWeight() {
    const w = parseFloat(newWeight);
    if (!w || w < 30 || w > 200) { toast.error("Peso inválido"); return; }
    const { error: e1 } = await supabase.from("profiles").update({ weight: w, last_weight_update: new Date().toISOString() }).eq("id", user!.id);
    const { error: e2 } = await supabase.from("weight_history").insert({ user_id: user!.id, weight: w });
    if (e1 || e2) { toast.error("Error al guardar"); return; }
    toast.success("Peso actualizado");
    setShowWeightModal(false);
    setProfile({ ...profile, weight: w, last_weight_update: new Date().toISOString() });
  }

  type CardData = {
    key: string;
    icon: React.ReactNode;
    title: string;
    text: string;
    to: string;
    cta: string;
    highlight?: boolean;
  };

  const pendingCards: CardData[] = [];
  if (!wellnessDone)
    pendingCards.push({
      key: "wellness",
      highlight: true,
      icon: <Heart className="h-5 w-5" />,
      title: "Completa tu bienestar de hoy",
      text: "Sueño, estrés, fatiga y dolor muscular. Toma menos de un minuto.",
      to: "/atleta/wellness",
      cta: "Ir al formulario",
    });
  if (pendingRpe)
    pendingCards.push({
      key: "rpe",
      icon: <Activity className="h-5 w-5" />,
      title: `Carga tu RPE de ${pendingRpe.name}`,
      text: `Sesión del ${fmtDateLong(pendingRpe.event_date)}${pendingRpe.event_time ? ` · ${fmtTime(pendingRpe.event_time)}` : ""}`,
      to: "/atleta/rpe",
      cta: "Cargar RPE",
    });
  if (appt)
    pendingCards.push({
      key: "appt",
      icon: <Stethoscope className="h-5 w-5" />,
      title: `${typeIcon(appt.appointment_type)} ${typeLabel(appt.appointment_type)}`,
      text: `${fmtRelative(appt.appointment_date)}${appt.appointment_time ? ` · ${fmtTime(appt.appointment_time)} h` : ""} · ${appt.status}`,
      to: "/atleta/fisio",
      cta: "Ver turno",
    });

  const infoCards: CardData[] = [];
  if (routine)
    infoCards.push({
      key: "routine",
      icon: <Dumbbell className="h-5 w-5" />,
      title: routine.title,
      text: `Rutina de ${MONTHS[(routine.month ?? 1) - 1]} ${routine.year}${routine.position ? ` · ${routine.position}` : ""}${routine.notes ? ` · ${routine.notes}` : ""}`,
      to: "/atleta/gym",
      cta: "Ver rutina",
    });

  const nothingPending = loaded && pendingCards.length === 0;

  return (
    <Shell>
      <div className="mb-6 flex items-center gap-4">
        {profile?.photo_url && (
          <div className="w-16 h-16 border border-border bg-secondary overflow-hidden flex-shrink-0">
            <img src={profile.photo_url} alt={profile.full_name} className="w-full h-full object-cover" />
          </div>
        )}
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Hoy</p>
          <h1 className="text-3xl sm:text-4xl">{profile?.full_name || "Atleta"}{profile?.last_name ? ` ${profile.last_name}` : ""}</h1>
          {profile?.position && <p className="mt-1 text-sm text-muted-foreground">{profile.position}</p>}
        </div>
      </div>

      <div className="space-y-4">
        {pendingCards.slice(0, 3).map((c) => (
          <TodayCard {...c} />
        ))}

        {nothingPending && (
          <div className="border-2 border-black p-8 text-center">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3" />
            <h2 className="text-2xl mb-1">Todo al día</h2>
            <p className="text-sm text-muted-foreground">
              No tienes nada pendiente por hoy. Buen trabajo.
            </p>
          </div>
        )}
      </div>

      {infoCards.length > 0 && (
        <div className="mt-6 border border-border">
          <button
            onClick={() => setShowMore((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold uppercase tracking-wide hover:bg-accent transition"
          >
            <span>Más adelante ({infoCards.length})</span>
            <ChevronDown className={"h-4 w-4 transition-transform " + (showMore ? "rotate-180" : "")} />
          </button>
          {showMore && (
            <div className="p-3 pt-0 space-y-3">
              {infoCards.map((c) => (
                <TodayCard {...c} />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Accesos</p>
        <div className="grid grid-cols-2 gap-3">
          <QuickLink to="/atleta/calendario" icon={<CalendarIcon className="h-4 w-4" />} label="Calendario" />
          <QuickLink to="/atleta/biblioteca" icon={<BookOpen className="h-4 w-4" />} label="Biblioteca" />
        </div>
      </div>

      <Dialog open={showWeightModal} onOpenChange={setShowWeightModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Actualización mensual de peso</DialogTitle>
            <DialogDescription>
              Ha pasado un mes desde tu última actualización. Ingresá tu peso actual.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="w">Peso (kg)</Label>
            <Input id="w" type="number" step="0.1" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWeightModal(false)}>Más tarde</Button>
            <Button onClick={saveWeight}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}

function TodayCard({
  icon, title, text, to, cta, highlight,
}: { icon: React.ReactNode; title: string; text: string; to: string; cta: string; highlight?: boolean }) {
  return (
    <div className={"p-5 " + (highlight ? "border-2 border-black bg-foreground text-background" : "border border-border")}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h2 className="text-xl leading-tight">{title}</h2>
      </div>
      <p className={"text-sm mb-4 " + (highlight ? "opacity-80" : "text-muted-foreground")}>{text}</p>
      <Link to={to}>
        <Button size="sm" variant={highlight ? "secondary" : "default"}>
          {cta} <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}

function QuickLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-2 border border-border p-3 text-sm font-semibold hover:bg-accent transition">
      {icon}
      {label}
    </Link>
  );
}
