import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Shell } from "@/components/Shell";
import { Protected } from "@/lib/protected";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Download, MessageCircle, CheckCircle2, Circle, ChevronRight, Image as ImageIcon, AlertTriangle, Activity, FileDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { toPng } from "html-to-image";
import { acwrColor, fatigueColor } from "@/lib/score-colors";
import { exportPdf } from "@/lib/pdf-export";

export const Route = createFileRoute("/coach/")({ component: () => <Protected requireRole="coach"><CoachDash /></Protected> });

type Period = "day" | "week" | "month";
const PERIOD_DAYS: Record<Period, number> = { day: 1, week: 7, month: 30 };

function startOfWeek(d = new Date()) {
  const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0, 0, 0, 0); return x;
}
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(0, 0, 0, 0); return d; }
function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

interface Row {
  id: string;
  full_name: string;
  last_name: string | null;
  photo_url: string | null;
  position: string | null;
  wellnessThisWeek: number;
  rpeThisWeek: number;
  weeklyLoad: number;
  chronicLoad: number;
  acwr: number | null;
  fatigueAccum: number;
  avgFatigue: number | null;
}

function CoachDash() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("week");

  const [exportType, setExportType] = useState<"rpe" | "wellness">("rpe");
  const [exportAthlete, setExportAthlete] = useState<string>("all");
  const [fromDate, setFromDate] = useState(isoDate(daysAgo(30)));
  const [toDate, setToDate] = useState(isoDate(new Date()));

  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderForm, setReminderForm] = useState<"wellness" | "rpe">("rpe");
  const [reminderMsg, setReminderMsg] = useState("");

  const chartRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const acuteDays = PERIOD_DAYS[period];
      const periodStart = isoDate(daysAgo(acuteDays - 1));
      const chronicStart = isoDate(daysAgo(28));

      // 1) Athletes via user_roles
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles").select("user_id").eq("role", "atleta");
      if (rolesErr) { toast.error(rolesErr.message); setLoading(false); return; }
      const ids = (roles ?? []).map((r) => r.user_id);

      if (ids.length === 0) { setRows([]); setLoading(false); return; }

      // 2) Profiles separately (RLS: coach can view all)
      const { data: profiles, error: profErr } = await supabase
        .from("profiles").select("id, full_name, last_name, photo_url, position").in("id", ids);
      if (profErr) { toast.error(profErr.message); setLoading(false); return; }

      // 3) Counts and load over last 28d
      const [{ data: wellness }, { data: rpe }] = await Promise.all([
        supabase.from("wellness_entries").select("user_id, entry_date, fatigue").in("user_id", ids).gte("entry_date", chronicStart),
        supabase.from("rpe_entries").select("user_id, session_date, rpe_score").in("user_id", ids).gte("session_date", chronicStart),
      ]);

      const wWeek: Record<string, number> = {};
      const rWeek: Record<string, number> = {};
      const acuteLoad: Record<string, number> = {};
      const chronicSum: Record<string, number> = {};
      const fatigueAcute: Record<string, number[]> = {};

      wellness?.forEach((w) => {
        if (w.entry_date >= periodStart) wWeek[w.user_id] = (wWeek[w.user_id] ?? 0) + 1;
        if (w.entry_date >= periodStart) (fatigueAcute[w.user_id] ??= []).push(w.fatigue);
      });
      rpe?.forEach((r) => {
        if (r.session_date >= periodStart) rWeek[r.user_id] = (rWeek[r.user_id] ?? 0) + 1;
        if (r.session_date >= periodStart) acuteLoad[r.user_id] = (acuteLoad[r.user_id] ?? 0) + r.rpe_score;
        chronicSum[r.user_id] = (chronicSum[r.user_id] ?? 0) + r.rpe_score;
      });

      const rs: Row[] = (profiles ?? []).map((p) => {
        const weekly = acuteLoad[p.id] ?? 0;
        const chronic = (chronicSum[p.id] ?? 0) / 4; // avg weekly over 4 weeks
        const acwr = chronic > 0 ? +(weekly / chronic).toFixed(2) : null;
        const fArr = fatigueAcute[p.id] ?? [];
        const fAvg = fArr.length ? +(fArr.reduce((a, b) => a + b, 0) / fArr.length).toFixed(1) : null;
        return {
          id: p.id,
          full_name: p.full_name,
          last_name: p.last_name,
          photo_url: p.photo_url,
          position: p.position,
          wellnessThisWeek: wWeek[p.id] ?? 0,
          rpeThisWeek: rWeek[p.id] ?? 0,
          weeklyLoad: weekly,
          chronicLoad: +chronic.toFixed(1),
          acwr,
          fatigueAccum: fArr.reduce((a, b) => a + b, 0),
          avgFatigue: fAvg,
        };
      }).sort((a, b) => a.full_name.localeCompare(b.full_name));

      setRows(rs);
      setLoading(false);
    })();
  }, [period]);

  // Aggregate by position
  const byPosition = useMemo(() => {
    const map: Record<string, { position: string; cargaSemanal: number; cargaCronica: number; fatiga: number; n: number }> = {};
    rows.forEach((r) => {
      const pos = r.position?.trim() || "Sin puesto";
      const e = (map[pos] ??= { position: pos, cargaSemanal: 0, cargaCronica: 0, fatiga: 0, n: 0 });
      e.cargaSemanal += r.weeklyLoad;
      e.cargaCronica += r.chronicLoad;
      e.fatiga += r.fatigueAccum;
      e.n += 1;
    });
    return Object.values(map).map((e) => ({
      position: e.position,
      cargaSemanal: +(e.cargaSemanal / e.n).toFixed(1),
      cargaCronica: +(e.cargaCronica / e.n).toFixed(1),
      fatiga: +(e.fatiga / e.n).toFixed(1),
    })).sort((a, b) => b.cargaSemanal - a.cargaSemanal);
  }, [rows]);

  async function exportCsv() {
    const table = exportType === "rpe" ? "rpe_entries" : "wellness_entries";
    const dateCol = exportType === "rpe" ? "session_date" : "entry_date";
    let q = supabase.from(table).select("*").gte(dateCol, fromDate).lte(dateCol, toDate).order(dateCol);
    if (exportAthlete !== "all") q = q.eq("user_id", exportAthlete);
    const { data, error } = await q;
    if (error) { toast.error(error.message); return; }
    if (!data?.length) { toast.error("Sin datos"); return; }
    const nameById: Record<string, string> = {};
    const posById: Record<string, string> = {};
    rows.forEach((r) => { nameById[r.id] = r.full_name; posById[r.id] = r.position ?? ""; });
    const enriched = data.map((row: any) => ({ atleta: nameById[row.user_id] ?? row.user_id, puesto: posById[row.user_id] ?? "", ...row }));
    const headers = Object.keys(enriched[0]);
    const csv = [headers.join(","), ...enriched.map((r: any) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${exportType}_${fromDate}_${toDate}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function exportChartPng() {
    if (!chartRef.current) return;
    try {
      const dataUrl = await toPng(chartRef.current, { backgroundColor: "#ffffff", pixelRatio: 2 });
      const a = document.createElement("a");
      a.href = dataUrl; a.download = `carga_por_puesto_${isoDate(new Date())}.png`; a.click();
    } catch (e: any) { toast.error(e.message ?? "Error al exportar"); }
  }

  function exportPositionCsv() {
    if (!byPosition.length) { toast.error("Sin datos"); return; }
    const headers = ["puesto", "carga_semanal_prom", "carga_cronica_prom", "fatiga_prom_7d"];
    const csv = [
      headers.join(","),
      ...byPosition.map((r) => [r.position, r.cargaSemanal, r.cargaCronica, r.fatiga].map((v) => JSON.stringify(v)).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `carga_por_puesto_${isoDate(new Date())}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function buildReminder() {
    const base = window.location.origin;
    const link = reminderForm === "rpe" ? `${base}/atleta/rpe` : `${base}/atleta/wellness`;
    const msg = reminderForm === "rpe"
      ? `🏉 EL TORO RUGBY · Recordatorio\n\nNo te olvides de cargar tu RPE de la sesión de hoy.\n\nEnlace directo: ${link}\n\n¡Gracias!`
      : `🏉 EL TORO RUGBY · Recordatorio\n\nBuen día. Completá tu cuestionario de bienestar matutino.\n\nEnlace directo: ${link}\n\n¡Gracias!`;
    setReminderMsg(msg); setReminderOpen(true);
  }
  function openWhatsApp() { window.open(`https://wa.me/?text=${encodeURIComponent(reminderMsg)}`, "_blank"); }
  async function copyReminder() { await navigator.clipboard.writeText(reminderMsg); toast.success("Copiado"); }

  return (
    <Shell title="Panel del preparador">
      <div className="mb-8">
        <div className="flex items-baseline justify-between mb-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Esta semana · Carga y fatiga</p>
          <p className="text-xs text-muted-foreground">{rows.length} atletas</p>
        </div>
        {loading ? <p className="text-sm text-muted-foreground">Cargando...</p> : (
          <div className="border border-border overflow-x-auto">
            <div className="grid grid-cols-[44px_1.6fr_0.7fr_0.7fr_0.9fr_0.9fr_0.9fr_24px] gap-2 px-4 py-3 border-b border-border text-xs uppercase tracking-wider font-medium bg-secondary min-w-[760px]">
              <div></div>
              <div>Atleta</div>
              <div className="text-center">Bienestar</div>
              <div className="text-center">RPE</div>
              <div className="text-center">Carga sem.</div>
              <div className="text-center">ACWR</div>
              <div className="text-center">Fatiga 7d</div>
              <div></div>
            </div>
            {rows.length === 0 && <p className="p-6 text-sm text-muted-foreground">Sin atletas todavía.</p>}
            {rows.map((r) => {
              const st = loadStatus(r.acwr);
              return (
                <Link key={r.id} to="/coach/atleta/$id" params={{ id: r.id }} className="grid grid-cols-[44px_1.6fr_0.7fr_0.7fr_0.9fr_0.9fr_0.9fr_24px] gap-2 px-4 py-3 border-b border-border last:border-b-0 hover:bg-accent items-center min-w-[760px]">
                  <div className="w-9 h-9 border border-border bg-secondary overflow-hidden">
                    {r.photo_url ? <img src={r.photo_url} alt={r.full_name} className="w-full h-full object-cover" /> : null}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{r.full_name}{r.last_name ? ` ${r.last_name}` : ""}</p>
                    {r.position && <p className="text-xs text-muted-foreground">{r.position}</p>}
                  </div>
                  <div className="flex items-center justify-center gap-1 text-xs">
                    {r.wellnessThisWeek > 0 ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                    <span>{r.wellnessThisWeek}/7</span>
                  </div>
                  <div className="flex items-center justify-center gap-1 text-xs">
                    {r.rpeThisWeek > 0 ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                    <span>{r.rpeThisWeek}</span>
                  </div>
                  <div className="text-center text-sm font-medium">{r.weeklyLoad}<span className="text-xs text-muted-foreground"> UA</span></div>
                  <div className={`text-center text-sm ${st.cls}`}>{r.acwr ?? "—"}<span className="block text-[10px] uppercase tracking-wider">{st.label}</span></div>
                  <div className="text-center text-sm flex items-center justify-center gap-1">
                    {r.avgFatigue != null && r.avgFatigue >= 4 && <AlertTriangle className="h-3 w-3" />}
                    {r.fatigueAccum || "—"}
                    {r.avgFatigue != null && <span className="text-[10px] text-muted-foreground">(μ{r.avgFatigue})</span>}
                  </div>
                  <div className="flex justify-end"><ChevronRight className="h-4 w-4 text-muted-foreground" /></div>
                </Link>
              );
            })}
          </div>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">
          UA = unidades de carga (suma RPE). ACWR = aguda 7d ÷ crónica 28d. Óptimo 0.8–1.3. &gt;1.5 indica riesgo de sobrecarga.
        </p>
      </div>

      <div className="border border-border p-6 mb-8">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl flex items-center gap-2"><Activity className="h-5 w-5" />Carga por puesto</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportPositionCsv}><Download className="h-4 w-4 mr-1" />CSV</Button>
            <Button size="sm" onClick={exportChartPng}><ImageIcon className="h-4 w-4 mr-1" />PNG</Button>
          </div>
        </div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Promedio por posición · últimos 7 / 28 días</p>
        <div ref={chartRef} className="bg-background p-2">
          {byPosition.length === 0 ? <p className="text-sm text-muted-foreground p-6">Sin datos suficientes.</p> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byPosition} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
                <XAxis dataKey="position" stroke="#000" fontSize={11} />
                <YAxis stroke="#000" fontSize={11} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #000", borderRadius: 0 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="cargaSemanal" name="Carga semanal (UA)" fill="#000" />
                <Bar dataKey="cargaCronica" name="Carga crónica (UA)" fill="#777" />
                <Bar dataKey="fatiga" name="Fatiga acum. 7d" fill="#bbb" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
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
          <DialogHeader>
            <DialogTitle>Recordatorio</DialogTitle>
            <DialogDescription>Copiá el texto o abrilo directamente en WhatsApp.</DialogDescription>
          </DialogHeader>
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
