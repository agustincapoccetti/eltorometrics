import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { Protected } from "@/lib/protected";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Download, MessageCircle, CheckCircle2, Circle, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/coach/")({ component: () => <Protected requireRole="coach"><CoachDash /></Protected> });

function startOfWeek(d = new Date()) {
  const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0,0,0,0); return x;
}

interface Row { id: string; full_name: string; position: string | null; wellnessThisWeek: number; rpeThisWeek: number; }

function CoachDash() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  // export filters
  const [exportType, setExportType] = useState<"rpe" | "wellness">("rpe");
  const [exportAthlete, setExportAthlete] = useState<string>("all");
  const [fromDate, setFromDate] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));

  // reminder
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderForm, setReminderForm] = useState<"wellness" | "rpe">("rpe");
  const [reminderMsg, setReminderMsg] = useState("");

  useEffect(() => {
    (async () => {
      const weekStart = startOfWeek().toISOString().slice(0, 10);
      const { data: athletes } = await supabase
        .from("user_roles").select("user_id, profiles!inner(id, full_name, position)")
        .eq("role", "atleta");

      const ids = (athletes ?? []).map((a: any) => a.user_id);
      const { data: wellness } = await supabase
        .from("wellness_entries").select("user_id, entry_date").in("user_id", ids.length ? ids : [""])
        .gte("entry_date", weekStart);
      const { data: rpe } = await supabase
        .from("rpe_entries").select("user_id, session_date").in("user_id", ids.length ? ids : [""])
        .gte("session_date", weekStart);

      const wCount: Record<string, number> = {};
      const rCount: Record<string, number> = {};
      wellness?.forEach((w) => { wCount[w.user_id] = (wCount[w.user_id] ?? 0) + 1; });
      rpe?.forEach((r) => { rCount[r.user_id] = (rCount[r.user_id] ?? 0) + 1; });

      const rs: Row[] = (athletes ?? []).map((a: any) => ({
        id: a.profiles.id,
        full_name: a.profiles.full_name,
        position: a.profiles.position,
        wellnessThisWeek: wCount[a.user_id] ?? 0,
        rpeThisWeek: rCount[a.user_id] ?? 0,
      })).sort((a, b) => a.full_name.localeCompare(b.full_name));

      setRows(rs);
      setLoading(false);
    })();
  }, []);

  async function exportCsv() {
    const table = exportType === "rpe" ? "rpe_entries" : "wellness_entries";
    const dateCol = exportType === "rpe" ? "session_date" : "entry_date";
    let q = supabase.from(table).select("*").gte(dateCol, fromDate).lte(dateCol, toDate).order(dateCol);
    if (exportAthlete !== "all") q = q.eq("user_id", exportAthlete);
    const { data, error } = await q;
    if (error) { toast.error(error.message); return; }
    if (!data?.length) { toast.error("Sin datos"); return; }

    const nameById: Record<string, string> = {};
    rows.forEach((r) => { nameById[r.id] = r.full_name; });

    const enriched = data.map((row: any) => ({ atleta: nameById[row.user_id] ?? row.user_id, ...row }));
    const headers = Object.keys(enriched[0]);
    const csv = [
      headers.join(","),
      ...enriched.map((r: any) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${exportType}_${fromDate}_${toDate}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function buildReminder() {
    const base = window.location.origin;
    const link = reminderForm === "rpe" ? `${base}/atleta/rpe` : `${base}/atleta/wellness`;
    const msg = reminderForm === "rpe"
      ? `🏉 EL TORO RUGBY · Recordatorio\n\nNo te olvides de cargar tu RPE de la sesión de hoy.\n\nEnlace directo: ${link}\n\n¡Gracias!`
      : `🏉 EL TORO RUGBY · Recordatorio\n\nBuen día. Completá tu cuestionario de bienestar matutino.\n\nEnlace directo: ${link}\n\n¡Gracias!`;
    setReminderMsg(msg);
    setReminderOpen(true);
  }

  function openWhatsApp() {
    const url = `https://wa.me/?text=${encodeURIComponent(reminderMsg)}`;
    window.open(url, "_blank");
  }

  async function copyReminder() {
    await navigator.clipboard.writeText(reminderMsg);
    toast.success("Copiado");
  }

  return (
    <Shell title="Panel del preparador">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Esta semana</p>
        {loading ? <p className="text-sm text-muted-foreground">Cargando...</p> : (
          <div className="border border-border">
            <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-border text-xs uppercase tracking-wider font-medium bg-secondary">
              <div className="col-span-5">Atleta</div>
              <div className="col-span-3 text-center">Bienestar</div>
              <div className="col-span-3 text-center">RPE</div>
              <div className="col-span-1"></div>
            </div>
            {rows.length === 0 && <p className="p-6 text-sm text-muted-foreground">Sin atletas todavía.</p>}
            {rows.map((r) => (
              <Link key={r.id} to="/coach/atleta/$id" params={{ id: r.id }} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-border last:border-b-0 hover:bg-accent items-center">
                <div className="col-span-5">
                  <p className="font-medium text-sm">{r.full_name}</p>
                  {r.position && <p className="text-xs text-muted-foreground">{r.position}</p>}
                </div>
                <div className="col-span-3 flex items-center justify-center gap-1 text-xs">
                  {r.wellnessThisWeek > 0 ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                  <span>{r.wellnessThisWeek}/7</span>
                </div>
                <div className="col-span-3 flex items-center justify-center gap-1 text-xs">
                  {r.rpeThisWeek > 0 ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                  <span>{r.rpeThisWeek}</span>
                </div>
                <div className="col-span-1 flex justify-end"><ChevronRight className="h-4 w-4 text-muted-foreground" /></div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="border border-border p-6">
          <h2 className="text-xl mb-1">Exportar datos</h2>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">CSV con filtros</p>
          <div className="space-y-3">
            <div>
              <Label>Formulario</Label>
              <Select value={exportType} onValueChange={(v) => setExportType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rpe">RPE</SelectItem>
                  <SelectItem value="wellness">Bienestar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Atleta</Label>
              <Select value={exportAthlete} onValueChange={setExportAthlete}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {rows.map((r) => <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Desde</Label><Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></div>
              <div><Label>Hasta</Label><Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></div>
            </div>
            <Button onClick={exportCsv} className="w-full"><Download className="h-4 w-4 mr-2" />Descargar CSV</Button>
          </div>
        </div>

        <div className="border border-border p-6">
          <h2 className="text-xl mb-1">Recordatorio</h2>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Mensaje listo para enviar</p>
          <div className="space-y-3">
            <div>
              <Label>Formulario</Label>
              <Select value={reminderForm} onValueChange={(v) => setReminderForm(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rpe">RPE (post entrenamiento)</SelectItem>
                  <SelectItem value="wellness">Bienestar (mañana)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={buildReminder} className="w-full"><MessageCircle className="h-4 w-4 mr-2" />Generar mensaje</Button>
          </div>
        </div>
      </div>

      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Recordatorio</DialogTitle></DialogHeader>
          <Textarea value={reminderMsg} onChange={(e) => setReminderMsg(e.target.value)} rows={8} className="font-mono text-sm" />
          <DialogFooter>
            <Button variant="outline" onClick={copyReminder}>Copiar</Button>
            <Button onClick={openWhatsApp}><MessageCircle className="h-4 w-4 mr-2" />Abrir WhatsApp</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
