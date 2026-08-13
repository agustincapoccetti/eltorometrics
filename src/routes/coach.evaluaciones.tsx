import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Shell } from "@/components/Shell";
import { SubTabs, PLANIFICACION_TABS } from "@/components/SubTabs";
import { Protected } from "@/lib/protected";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { Plus, Trash2, FileDown, ClipboardList } from "lucide-react";
import { exportPdf } from "@/lib/pdf-export";

export const Route = createFileRoute("/coach/evaluaciones")({
  component: () => <Protected requireRole="coach"><Page /></Protected>,
});

function fullName(p: any) { return p ? `${p.full_name}${p.last_name ? " " + p.last_name : ""}` : "—"; }

function Page() {
  const { user } = useAuth();
  const [tests, setTests] = useState<any[]>([]);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const posChartRef = useRef<HTMLDivElement>(null);
  const evoChartRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({ name: "", description: "", eval_date: new Date().toISOString().slice(0, 10), unit: "", higher_is_better: "true" });

  async function load() {
    const { data: t } = await supabase.from("evaluations").select("*").order("eval_date", { ascending: false });
    setTests(t ?? []);
    const { data: r } = await supabase.from("evaluation_results").select("*");
    setResults(r ?? []);
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "atleta");
    const ids = (roles ?? []).map((x) => x.user_id);
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, last_name, position").in("id", ids);
      setAthletes((profs ?? []).sort((a, b) => (a.last_name ?? a.full_name).localeCompare(b.last_name ?? b.full_name)));
    }
  }
  useEffect(() => { load(); }, []);
  useEffect(() => { if (!selected && tests.length) setSelected(tests[0].id); }, [tests]);

  const test = useMemo(() => tests.find((t) => t.id === selected), [tests, selected]);

  // Precargar valores existentes del test elegido
  useEffect(() => {
    const v: Record<string, string> = {}; const n: Record<string, string> = {};
    results.filter((r) => r.evaluation_id === selected).forEach((r) => { v[r.user_id] = String(r.value); n[r.user_id] = r.notes ?? ""; });
    setValues(v); setNotes(n);
  }, [selected, results]);

  async function createTest() {
    if (!form.name.trim()) { toast.error("Poné un nombre al test"); return; }
    const { data, error } = await supabase.from("evaluations").insert({
      name: form.name.trim(), description: form.description || null, eval_date: form.eval_date,
      unit: form.unit.trim(), higher_is_better: form.higher_is_better === "true", created_by: user!.id,
    }).select("id").single();
    if (error) { toast.error(error.message); return; }
    toast.success("Test creado");
    setForm({ ...form, name: "", description: "" });
    await load();
    if (data?.id) setSelected(data.id);
  }

  async function removeTest(id: string) {
    if (!confirm("¿Eliminar el test y todos sus resultados?")) return;
    const { error } = await supabase.from("evaluations").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setSelected("");
    load();
  }

  async function saveResults() {
    if (!test) return;
    setSaving(true);
    const rows = athletes
      .filter((a) => values[a.id] !== undefined && values[a.id] !== "")
      .map((a) => ({ evaluation_id: test.id, user_id: a.id, value: Number(values[a.id]), notes: notes[a.id] || null, created_by: user!.id }));
    const removeIds = athletes.filter((a) => !values[a.id]).map((a) => a.id);
    if (removeIds.length) {
      await supabase.from("evaluation_results").delete().eq("evaluation_id", test.id).in("user_id", removeIds);
    }
    if (rows.length) {
      const { error } = await supabase.from("evaluation_results").upsert(rows, { onConflict: "evaluation_id,user_id" });
      if (error) { setSaving(false); toast.error(error.message); return; }
    }
    setSaving(false);
    toast.success("Resultados guardados");
    load();
  }

  const testResults = useMemo(() => results.filter((r) => r.evaluation_id === selected), [results, selected]);

  const byPosition = useMemo(() => {
    const m: Record<string, { position: string; sum: number; n: number }> = {};
    testResults.forEach((r) => {
      const p = athletes.find((a) => a.id === r.user_id);
      const pos = p?.position ?? "Sin puesto";
      const e = (m[pos] ??= { position: pos, sum: 0, n: 0 });
      e.sum += Number(r.value); e.n++;
    });
    return Object.values(m).map((e) => ({ position: e.position, promedio: Math.round((e.sum / e.n) * 100) / 100, jugadores: e.n }));
  }, [testResults, athletes]);

  // Evolución: mismos tests (mismo nombre) en distintas fechas
  const evolution = useMemo(() => {
    if (!test) return [];
    const same = tests.filter((t) => t.name === test.name).sort((a, b) => a.eval_date.localeCompare(b.eval_date));
    return same.map((t) => {
      const rs = results.filter((r) => r.evaluation_id === t.id);
      const avg = rs.length ? rs.reduce((s, r) => s + Number(r.value), 0) / rs.length : 0;
      return { date: t.eval_date, promedio: Math.round(avg * 100) / 100, jugadores: rs.length };
    });
  }, [test, tests, results]);

  const detailRows = useMemo(
    () => testResults
      .map((r) => {
        const p = athletes.find((a) => a.id === r.user_id);
        return { name: fullName(p), position: p?.position ?? "—", value: Number(r.value), notes: r.notes ?? "", user_id: r.user_id };
      })
      .sort((a, b) => (test?.higher_is_better ? b.value - a.value : a.value - b.value)),
    [testResults, athletes, test],
  );

  function exportCsv() {
    if (!test) return;
    const head = ["Test", "Fecha", "Unidad", "Atleta", "Puesto", "Valor", "Notas"];
    const lines = [head.join(","), ...detailRows.map((r) => [test.name, test.eval_date, test.unit, r.name, r.position, r.value, (r.notes ?? "").replace(/,/g, ";")].join(","))];
    const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `evaluacion_${test.name.replace(/\s+/g, "_")}_${test.eval_date}.csv`;
    a.click();
  }

  async function downloadPdf() {
    if (!test) return;
    await exportPdf({
      title: `Evaluación · ${test.name}`,
      subtitle: `${test.eval_date}${test.unit ? ` · ${test.unit}` : ""} · ${detailRows.length} jugadores`,
      chartEls: [posChartRef.current, evoChartRef.current].filter(Boolean) as HTMLElement[],
      tables: [
        { title: "Resultados", head: ["Atleta", "Puesto", `Valor (${test.unit || "-"})`, "Notas"], rows: detailRows.map((r) => [r.name, r.position, r.value, r.notes]) },
        { title: "Promedio por puesto", head: ["Puesto", "Promedio", "Jugadores"], rows: byPosition.map((p) => [p.position, p.promedio, p.jugadores]) },
        { title: "Evolución del test", head: ["Fecha", "Promedio", "Jugadores"], rows: evolution.map((e) => [e.date, e.promedio, e.jugadores]) },
      ],
      filename: `evaluacion_${test.name.replace(/\s+/g, "_")}.pdf`,
    });
  }

  return (
    <Shell title="Evaluaciones">
      <SubTabs tabs={PLANIFICACION_TABS} />
      <p className="text-sm text-muted-foreground mb-6">Cargá tests físicos, anotá los valores de cada jugador y compará por puesto o por evolución cuando repitas el mismo test.</p>

      <div className="border border-border p-6 mb-8">
        <h2 className="text-xl mb-4 flex items-center gap-2"><ClipboardList className="h-4 w-4" />Nuevo test</h2>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <div>
            <Label htmlFor="n">Nombre</Label>
            <Input id="n" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Yo-Yo IR1, Sentadilla 1RM, Sprint 40m" />
          </div>
          <div>
            <Label htmlFor="d">Fecha</Label>
            <Input id="d" type="date" value={form.eval_date} onChange={(e) => setForm({ ...form, eval_date: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="u">Unidad</Label>
            <Input id="u" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="seg, kg, m, reps..." />
          </div>
          <div>
            <Label>¿Qué es mejor?</Label>
            <Select value={form.higher_is_better} onValueChange={(v) => setForm({ ...form, higher_is_better: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Valor más alto es mejor</SelectItem>
                <SelectItem value="false">Valor más bajo es mejor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="desc">Información del test</Label>
            <Textarea id="desc" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Protocolo, condiciones, material..." />
          </div>
        </div>
        <Button onClick={createTest} className="w-full"><Plus className="h-4 w-4 mr-2" />Crear test</Button>
      </div>

      {tests.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay tests cargados.</p>
      ) : (
        <>
          <div className="flex items-end gap-2 mb-4 flex-wrap">
            <div className="flex-1 min-w-[220px]">
              <Label>Test</Label>
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tests.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} · {t.eval_date}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={exportCsv}><FileDown className="h-4 w-4 mr-2" />CSV</Button>
            <Button variant="outline" onClick={downloadPdf}><FileDown className="h-4 w-4 mr-2" />PDF</Button>
            {test && <Button variant="ghost" onClick={() => removeTest(test.id)}><Trash2 className="h-4 w-4" /></Button>}
          </div>

          {test?.description && <p className="text-xs text-muted-foreground mb-4 border border-border p-3">{test.description}</p>}

          <div className="border border-border mb-8 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-2 text-left">Jugador</th>
                  <th className="p-2 text-left">Puesto</th>
                  <th className="p-2 text-left w-32">Valor {test?.unit ? `(${test.unit})` : ""}</th>
                  <th className="p-2 text-left">Notas</th>
                </tr>
              </thead>
              <tbody>
                {athletes.map((a) => (
                  <tr key={a.id} className="border-t border-border">
                    <td className="p-2"><Link to="/coach/atleta/$id" params={{ id: a.id }} className="hover:underline">{fullName(a)}</Link></td>
                    <td className="p-2 text-xs text-muted-foreground">{a.position ?? "—"}</td>
                    <td className="p-2">
                      <Input type="number" step="0.01" value={values[a.id] ?? ""} onChange={(e) => setValues({ ...values, [a.id]: e.target.value })} placeholder="—" />
                    </td>
                    <td className="p-2">
                      <Input value={notes[a.id] ?? ""} onChange={(e) => setNotes({ ...notes, [a.id]: e.target.value })} placeholder="Opcional" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button onClick={saveResults} disabled={saving} className="w-full mb-8" size="lg">{saving ? "Guardando..." : "Guardar resultados"}</Button>

          <div ref={posChartRef} className="border border-border p-6 mb-4 bg-background">
            <h2 className="text-xl mb-1">Comparación por puesto</h2>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Promedio del test seleccionado</p>
            {byPosition.length === 0 ? <p className="text-sm text-muted-foreground">Sin resultados cargados.</p> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={byPosition}>
                  <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
                  <XAxis dataKey="position" stroke="#000" fontSize={10} />
                  <YAxis stroke="#000" fontSize={11} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #000", borderRadius: 0 }} />
                  <Legend />
                  <Bar dataKey="promedio" fill="#000" name={`Promedio ${test?.unit ?? ""}`} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div ref={evoChartRef} className="border border-border p-6 mb-8 bg-background">
            <h2 className="text-xl mb-1">Evolución del test</h2>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Promedio del plantel cada vez que se repitió “{test?.name}”</p>
            {evolution.length < 2 ? <p className="text-sm text-muted-foreground">Repetí el test con el mismo nombre para ver la evolución.</p> : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={evolution}>
                  <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="#000" fontSize={11} />
                  <YAxis stroke="#000" fontSize={11} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #000", borderRadius: 0 }} />
                  <Line type="monotone" dataKey="promedio" stroke="#000" strokeWidth={2} dot={{ r: 3, fill: "#000" }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <h2 className="text-xl mb-3">Ranking del test</h2>
          <div className="border border-border overflow-x-auto mb-8">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-xs uppercase tracking-wider">
                <tr><th className="p-2 text-left">#</th><th className="p-2 text-left">Jugador</th><th className="p-2">Puesto</th><th className="p-2">Valor</th></tr>
              </thead>
              <tbody>
                {detailRows.map((r, i) => (
                  <tr key={r.user_id} className="border-t border-border">
                    <td className="p-2 font-display">{i + 1}</td>
                    <td className="p-2">{r.name}</td>
                    <td className="p-2 text-center text-xs text-muted-foreground">{r.position}</td>
                    <td className="p-2 text-center font-display">{r.value} {test?.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Shell>
  );
}
