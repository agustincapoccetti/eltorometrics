import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { exportPdf } from "@/lib/pdf-export";

const TL: Record<string, string> = { dhb: "DHB", regional: "Regional" };

export function MatchesExport() {
  const y = new Date().getFullYear();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(`${y}-01-01`);
  const [to, setTo] = useState(`${y}-12-31`);
  const [busy, setBusy] = useState(false);

  async function build() {
    const { data: ms } = await supabase.from("matches").select("id, match_date, opponent, tournament").gte("match_date", from).lte("match_date", to);
    const matches = (ms ?? []) as any[];
    const ids = matches.map((m) => m.id);
    if (!ids.length) return null;
    const { data: parts } = await supabase.from("match_participations").select("match_id, user_id, convoked, minutes_played, injury, injury_note").in("match_id", ids);
    const uids = [...new Set((parts ?? []).map((p) => p.user_id))];
    const { data: profs } = uids.length ? await supabase.from("profiles").select("id, full_name, last_name, position").in("id", uids) : { data: [] as any[] };
    const pm = new Map((profs ?? []).map((p: any) => [p.id, p]));
    const mm = new Map(matches.map((m) => [m.id, m]));
    const agg = new Map<string, any>();
    const injuries: (string | number)[][] = [];
    for (const p of parts ?? []) {
      const m = mm.get(p.match_id); const pr: any = pm.get(p.user_id);
      const name = pr ? `${pr.last_name ? pr.last_name + ", " : ""}${pr.full_name}` : "—";
      const a = agg.get(p.user_id) ?? { name, pos: pr?.position ?? "", conv: 0, dhbM: 0, dhbP: 0, regM: 0, regP: 0, inj: 0 };
      if (p.convoked) a.conv++;
      const mins = p.minutes_played ?? 0;
      if (m.tournament === "dhb") { a.dhbM += mins; if (mins > 0) a.dhbP++; } else { a.regM += mins; if (mins > 0) a.regP++; }
      if (p.injury) { a.inj++; injuries.push([name, m.match_date, m.opponent || "", TL[m.tournament] ?? m.tournament, p.injury_note ?? ""]); }
      agg.set(p.user_id, a);
    }
    const rows = [...agg.values()].sort((a, b) => a.name.localeCompare(b.name)).map((a) => [a.name, a.pos, a.conv, a.dhbP, a.dhbM, a.regP, a.regM, a.dhbM + a.regM, a.inj]);
    return { rows, injuries };
  }

  const head = ["Jugador", "Puesto", "Convocatorias", "Partidos DHB", "Min DHB", "Partidos Regional", "Min Regional", "Min total", "Lesiones"];

  async function run(kind: "csv" | "pdf") {
    setBusy(true);
    try {
      const r = await build();
      if (!r) { toast.error("No hay partidos en ese rango"); return; }
      const fn = `partidos_${from}_${to}`;
      if (kind === "csv") {
        const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
        const lines = [head, ...r.rows, [], ["Lesiones"], ["Jugador", "Fecha", "Rival", "Torneo", "Detalle"], ...r.injuries].map((l) => l.map(esc).join(";"));
        const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = fn + ".csv"; a.click();
      } else {
        await exportPdf({ title: "Minutos por jugador", subtitle: `${from} a ${to}`, filename: fn + ".pdf",
          tables: [{ title: "Minutos por torneo", head, rows: r.rows }, { title: "Lesiones", head: ["Jugador", "Fecha", "Rival", "Torneo", "Detalle"], rows: r.injuries }] });
      }
      setOpen(false);
    } finally { setBusy(false); }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}><Download className="h-4 w-4 mr-2" />Exportar</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Exportar minutos y lesiones</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Desde</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div><Label>Hasta</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => run("csv")}>CSV</Button>
            <Button disabled={busy} onClick={() => run("pdf")}>PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
