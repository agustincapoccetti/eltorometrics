import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { SubTabs, ENTRENO_TABS } from "@/components/SubTabs";
import { GymRecords } from "@/components/GymRecords";
import { Protected } from "@/lib/protected";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileText } from "lucide-react";

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export const Route = createFileRoute("/atleta/gym")({
  head: () => ({ meta: [
    { title: "Gym y cargas | El Toro Rugby Performance" },
    { name: "description", content: "Tus rutinas de gimnasio y el historial semanal de cargas y repeticiones en El Toro Rugby Performance." },
    { property: "og:title", content: "Gym y cargas | El Toro Rugby Performance" },
    { property: "og:description", content: "Rutinas e historial personal de cargas de gimnasio por semana y ejercicio." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <Protected requireRole="atleta"><Page /></Protected>,
});

function Page() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [routines, setRoutines] = useState<any[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  async function load() {
    if (!user) return;
    const { data: p } = await supabase.from("profiles").select("position").eq("id", user.id).single();
    setProfile(p);
    const { data } = await supabase.from("gym_routines").select("*").order("year",{ascending:false}).order("month",{ascending:false});
    const filt = (data ?? []).filter((r) => !r.position || r.position === p?.position);
    setRoutines(filt);
  }
  useEffect(() => { load(); }, [user]);

  async function openPdf(path: string) {
    // Open the tab synchronously so mobile browsers don't block it after the await.
    const win = window.open("", "_blank");
    const { data, error } = await supabase.storage.from("gym-pdfs").createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) {
      win?.close();
      toast.error("No se pudo abrir el PDF");
      return;
    }
    if (win) win.location.href = data.signedUrl;
    else window.location.href = data.signedUrl;
  }

  return (
    <Shell title="Gimnasio">
      <SubTabs tabs={ENTRENO_TABS} />
      {routines.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay rutinas publicadas para tu posición.</p>}

      <div className="space-y-3">
        {routines.map((r) => (
          <div key={r.id} className="border border-border">
            <div className="p-4 flex items-center gap-3 flex-wrap">
              <FileText className="h-5 w-5"/>
              <div className="flex-1 min-w-0 basis-48">
                <p className="font-medium break-words">{r.title}</p>
                <p className="text-xs text-muted-foreground">{MONTHS[r.month-1]} {r.year} · {r.position ?? "Todos"}</p>
                {r.notes && <p className="text-xs mt-1">{r.notes}</p>}
              </div>
              <Button variant="outline" className="min-h-11" size="sm" onClick={() => openPdf(r.pdf_path)}><FileText />Abrir PDF</Button>
              <Button variant="ghost" className="min-h-11" size="sm" onClick={() => setOpen(open === r.id ? null : r.id)}>
                {open === r.id ? "Cerrar" : "Mis registros"}
              </Button>
            </div>
            {open === r.id && user && <GymRecords routineId={r.id} userId={user.id} />}
          </div>
        ))}
      </div>
    </Shell>
  );
}

