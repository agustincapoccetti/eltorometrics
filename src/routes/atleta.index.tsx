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
import { Activity, Heart, CheckCircle2, Circle, Sparkles, Calendar as CalendarIcon } from "lucide-react";

export const Route = createFileRoute("/atleta/")({ component: () => <Protected requireRole="atleta"><AthleteHome /></Protected> });

function startOfWeek(d = new Date()) {
  const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0,0,0,0); return x;
}

function AthleteHome() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [todayWellness, setTodayWellness] = useState(false);
  const [weekRpe, setWeekRpe] = useState(0);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [newWeight, setNewWeight] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(p);
      if (p?.last_weight_update) {
        const days = (Date.now() - new Date(p.last_weight_update).getTime()) / 86400000;
        if (days >= 30) { setNewWeight(String(p.weight ?? "")); setShowWeightModal(true); }
      } else if (p) {
        setNewWeight(String(p.weight ?? "")); setShowWeightModal(true);
      }

      const today = new Date().toISOString().slice(0, 10);
      const { data: w } = await supabase.from("wellness_entries").select("id").eq("user_id", user.id).eq("entry_date", today).maybeSingle();
      setTodayWellness(!!w);

      const weekStart = startOfWeek().toISOString().slice(0, 10);
      const { count } = await supabase.from("rpe_entries").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("session_date", weekStart);
      setWeekRpe(count ?? 0);
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

  const bmi = profile?.weight && profile?.height ? (profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1) : null;

  return (
    <Shell>
      <div className="mb-8 flex items-center gap-4">
        {profile?.photo_url && (
          <div className="w-16 h-16 border border-border bg-secondary overflow-hidden flex-shrink-0">
            <img src={profile.photo_url} alt={profile.full_name} className="w-full h-full object-cover" />
          </div>
        )}
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Hola</p>
          <h1 className="text-4xl">{profile?.full_name || "Atleta"}{profile?.last_name ? ` ${profile.last_name}` : ""}</h1>
          {profile?.position && <p className="mt-1 text-sm text-muted-foreground">{profile.position}{bmi && ` · IMC ${bmi}`}</p>}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <FormCard
          to="/atleta/wellness"
          icon={<Heart className="h-5 w-5" />}
          title="Bienestar"
          subtitle="Cada mañana"
          done={todayWellness}
          doneLabel="Completado hoy"
          pendingLabel="Pendiente hoy"
        />
        <FormCard
          to="/atleta/rpe"
          icon={<Activity className="h-5 w-5" />}
          title="RPE"
          subtitle="Después de cada entrenamiento"
          done={weekRpe > 0}
          doneLabel={`${weekRpe} sesión(es) esta semana`}
          pendingLabel="Sin registros esta semana"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <FormCard
          to="/atleta/recuperacion"
          icon={<Sparkles className="h-5 w-5" />}
          title="Recuperación"
          subtitle="Tildeá lo que cumpliste hoy"
          done={false}
          doneLabel=""
          pendingLabel="Sumá puntos a tu score"
        />
        <FormCard
          to="/atleta/calendario"
          icon={<CalendarIcon className="h-5 w-5" />}
          title="Calendario"
          subtitle="Entrenamientos y partidos"
          done={false}
          doneLabel=""
          pendingLabel="Ver agenda del equipo"
        />
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

function FormCard({ to, icon, title, subtitle, done, doneLabel, pendingLabel }: any) {
  return (
    <Link to={to} className="block border border-border p-6 hover:bg-accent transition">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-2xl">{title}</h2>
        </div>
        {done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
      </div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{subtitle}</p>
      <p className="text-sm">{done ? doneLabel : pendingLabel}</p>
    </Link>
  );
}
