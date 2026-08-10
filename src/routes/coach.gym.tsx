import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { Protected } from "@/lib/protected";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, FileText, Upload } from "lucide-react";
import { notifyAllAthletes } from "@/lib/notifications";

const POSITIONS = ["Todos","Pilar","Hooker","Segunda Línea","Ala","Octavo","Medio Scrum","Apertura","Centro","Wing","Fullback"];
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export const Route = createFileRoute("/coach/gym")({
  component: () => <Protected requireRole="coach"><Page /></Protected>,
});

function Page() {
  const { user } = useAuth();
  const now = new Date();
  const [title, setTitle] = useState("");
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [position, setPosition] = useState("Todos");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [routines, setRoutines] = useState<any[]>([]);

  async function load() {
    const { data } = await supabase.from("gym_routines").select("*").order("year",{ascending:false}).order("month",{ascending:false});
    setRoutines(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function upload() {
    if (!file) { toast.error("Adjuntá un PDF"); return; }
    if (!title.trim()) { toast.error("Pon un título"); return; }
    if (file.type !== "application/pdf") { toast.error("Solo PDF"); return; }
    setUploading(true);
    const path = `${user!.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g,"_")}`;
    const { error: upErr } = await supabase.storage.from("gym-pdfs").upload(path, file, { contentType: "application/pdf" });
    if (upErr) { toast.error(upErr.message); setUploading(false); return; }
    const { error } = await supabase.from("gym_routines").insert({
      title: title.trim(), month: parseInt(month), year: parseInt(year),
      position: position === "Todos" ? null : position,
      pdf_path: path, notes: notes || null, created_by: user!.id,
    });
    setUploading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Rutina publicada");
    await notifyAllAthletes({
      title: "Nueva rutina de gimnasio",
      body: `${title.trim()} · ${MONTHS[parseInt(month) - 1]} ${year}${position !== "Todos" ? ` · ${position}` : ""}`,
      link: "/atleta/gym", kind: "gym", created_by: user!.id,
    });
    setTitle(""); setNotes(""); setFile(null);
    load();
  }

  async function remove(r: any) {
    if (!confirm("¿Eliminar esta rutina?")) return;
    await supabase.storage.from("gym-pdfs").remove([r.pdf_path]);
    await supabase.from("gym_routines").delete().eq("id", r.id);
    load();
  }

  async function openPdf(path: string) {
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
      <p className="text-sm text-muted-foreground mb-6">Subí la rutina mensual en PDF. Los atletas pueden registrar peso, repeticiones y observaciones.</p>

      <div className="border border-border p-6 mb-8">
        <h2 className="text-xl mb-4">Nueva rutina</h2>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <div className="sm:col-span-2">
            <Label htmlFor="t">Título</Label>
            <Input id="t" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Fuerza máxima - mes 1" />
          </div>
          <div>
            <Label>Mes</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>{MONTHS.map((m,i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="y">Año</Label>
            <Input id="y" type="number" value={year} onChange={(e) => setYear(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Destinatarios</Label>
            <Select value={position} onValueChange={setPosition}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>{POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="n">Recomendaciones del mes</Label>
            <Textarea id="n" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Notas, recordatorios, foco del mes..." />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="f">PDF</Label>
            <Input id="f" type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <Button onClick={upload} disabled={uploading} className="w-full"><Upload className="h-4 w-4 mr-2"/>{uploading ? "Subiendo..." : "Publicar rutina"}</Button>
      </div>

      <h2 className="text-xl mb-3">Rutinas publicadas</h2>
      <div className="space-y-2">
        {routines.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay rutinas.</p>}
        {routines.map((r) => (
          <div key={r.id} className="border border-border p-4 flex items-center gap-3 flex-wrap">
            <FileText className="h-5 w-5"/>
            <div className="flex-1 min-w-[200px]">
              <p className="font-medium">{r.title}</p>
              <p className="text-xs text-muted-foreground">{MONTHS[r.month-1]} {r.year} · {r.position ?? "Todos"}</p>
              {r.notes && <p className="text-xs mt-1">{r.notes}</p>}
            </div>
            <Button variant="outline" size="sm" onClick={() => openPdf(r.pdf_path)}>Abrir PDF</Button>
            <Button variant="ghost" size="sm" onClick={() => remove(r)}><Trash2 className="h-4 w-4"/></Button>
          </div>
        ))}
      </div>
    </Shell>
  );
}
