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
import { Plus, Trash2, FileDown, ClipboardList, ChevronDown, ChevronRight, Pencil, BarChart3 } from "lucide-react";
import { exportPdf } from "@/lib/pdf-export";

export const Route = createFileRoute("/coach/evaluaciones")({
  component: () => <Protected requireRole="coach"><Page /></Protected>,
});

function fullName(p: any) { return p ? `${p.full_name}${p.last_name ? " " + p.last_name : ""}` : "—"; }

/** Unidades de medida disponibles para los tests físicos. */
const UNITS: { value: string; label: string }[] = [
  { value: "seg", label: "Segundos (seg)" },
  { value: "min", label: "Minutos (min)" },
  { value: "m", label: "Metros (m)" },
  { value: "cm", label: "Centímetros (cm)" },
  { value: "km", label: "Kilómetros (km)" },
  { value: "kg", label: "Kilogramos (kg)" },
  { value: "reps", label: "Repeticiones (reps)" },
  { value: "m/s", label: "Velocidad (m/s)" },
  { value: "km/h", label: "Velocidad (km/h)" },
  { value: "W", label: "Potencia (W)" },
  { value: "ml/kg/min", label: "VO2máx (ml/kg/min)" },
  { value: "nivel", label: "Nivel / etapa" },
  { value: "%", label: "Porcentaje (%)" },
  { value: "puntos", label: "Puntos" },
];

const CHART_COLORS = ["#000000", "#666666", "#999999", "#333333", "#bbbbbb", "#4d4d4d"];

function Page() {
  const { user } = useAuth();
  const [tests, setTests] = useState<any[]>([]);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string>("");
  const [editing, setEditing] = useState<string>("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [compare, setCompare] = useState<string[]>([]);
  const posChartRef = useRef<HTMLDivElement>(null);
  const evoChartRef = useRef<HTMLDivElement>(null);
  const cmpChartRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({ name: "", description: "", eval_date: new Date().toISOString().slice(0, 10), unit: "seg", customUnit: "", higher_is_better: "true" });

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

  const test = useMemo(() => tests.find((t) => t.id === expanded), [tests, expanded]);

  // Precargar valores existentes del test abierto
  useEffect(() => {
    const v: Record<string, string> = {}; const n: Record<string, string> = {};
    results.filter((r) => r.evaluation_id === expanded).forEach((r) => { v[r.user_id] = String(r.value); n[r.user_id] = r.notes ?? ""; });
    setValues(v); setNotes(n);
  }, [expanded, results]);

  async function createTest() {
    if (!form.name.trim()) { toast.error("Poné un nombre al test"); return; }
    const unit = (form.unit === "otra" ? form.customUnit : form.unit).trim();
    const { data, error } = await supabase.from("evaluations").insert({
      name: form.name.trim(), description: form.description || null, eval_date: form.eval_date,
      unit, higher_is_better: form.higher_is_better === "true", created_by: user!.id,
    }).select("id").single();
    if (error) { toast.error(error.message); return; }
    toast.success("Test creado");
    setForm({ ...form, name: "", description: "" });
    await load();
    if (data?.id) { setExpanded(data.id); setEditing(data.id); }
  }

  async function removeTest(id: string) {
    if (!confirm("¿Eliminar el test y todos sus resultados?")) return;
    const { error } = await supabase.from("evaluations").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setExpanded(""); setEditing("");
    setCompare((c) => c.filter((x) => x !== id));
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
    setEditing("");
    toast.success("Resultados guardados");
    load();
  }

  const testResults = useMemo(() => results.filter((r) => r.evaluation_id === expanded), [results, expanded]);

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

  // ---- Comparación de tests seleccionados ----
  const cmpTests = useMemo(
    () => compare.map((id) => tests.find((t) => t.id === id)).filter(Boolean).sort((a, b) => a.eval_date.localeCompare(b.eval_date)),
    [compare, tests],
  );
  const cmpLabel = (t: any) => `${t.name} · ${t.eval_date}`;

  const cmpAthleteRows = useMemo(() => {
    return athletes
      .map((a) => {
        const row: any = { name: fullName(a), position: a.position ?? "—", id: a.id };
        let any = false;
        cmpTests.forEach((t) => {
          const r = results.find((x) => x.evaluation_id === t.id && x.user_id === a.id);
          row[t.id] = r ? Number(r.value) : null;
          if (r) any = true;
        });
        return any ? row : null;
      })
      .filter(Boolean) as any[];
  }, [athletes, cmpTests, results]);

  const cmpByPosition = useMemo(() => {
    const positions = Array.from(new Set(cmpAthleteRows.map((r) => r.position)));
    return positions.map((pos) => {
      const row: any = { position: pos };
      cmpTests.forEach((t) => {
        const vals = cmpAthleteRows.filter((r) => r.position === pos && r[t.id] != null).map((r) => r[t.id] as number);
        row[t.id] = vals.length ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100) / 100 : null;
      });
      return row;
    });
  }, [cmpAthleteRows, cmpTests]);

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

  async function downloadComparePdf() {
    if (!cmpTests.length) return;
    await exportPdf({
      title: cmpTests.length > 1 ? "Comparación de tests" : `Resultados · ${cmpTests[0].name}`,
      subtitle: cmpTests.map(cmpLabel).join("  |  "),
      chartEls: [cmpChartRef.current].filter(Boolean) as HTMLElement[],
      tables: [
        {
          title: "Por jugador",
          head: ["Atleta", "Puesto", ...cmpTests.map((t) => `${t.name} (${t.unit || "-"})`)],
          rows: cmpAthleteRows.map((r) => [r.name, r.position, ...cmpTests.map((t) => (r[t.id] ?? "—"))]),
        },
        {
          title: "Promedio por puesto",
          head: ["Puesto", ...cmpTests.map((t) => t.name)],
          rows: cmpByPosition.map((r) => [r.position, ...cmpTests.map((t) => (r[t.id] ?? "—"))]),
        },
      ],
      filename: "comparacion_tests.pdf",
    });
  }

  function exportCompareCsv() {
    if (!cmpTests.length) return;
    const head = ["Atleta", "Puesto", ...cmpTests.map((t) => `${t.name} ${t.eval_date} (${t.unit || "-"})`)];
    const lines = [head.join(","), ...cmpAthleteRows.map((r) => [r.name, r.position, ...cmpTests.map((t) => r[t.id] ?? "")].join(","))];
    const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "comparacion_tests.csv";
    a.click();
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
            <Label>Unidad de medida</Label>
            <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
              <SelectTrigger><SelectValue placeholder="Elegí la unidad" /></SelectTrigger>
              <SelectContent>
                {UNITS.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                <SelectItem value="otra">Otra (escribir)</SelectItem>
              </SelectContent>
            </Select>
            {form.unit === "otra" && (
              <Input className="mt-2" value={form.customUnit} onChange={(e) => setForm({ ...form, customUnit: e.target.value })} placeholder="Escribí la unidad" />
            )}
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
          <h2 className="text-xl mb-3">Tests cargados</h2>
          <div className="space-y-2 mb-8">
            {tests.map((t) => {
              const open = expanded === t.id;
              const count = results.filter((r) => r.evaluation_id === t.id).length;
              return (
                <div key={t.id} className="border border-border">
                  <button
                    type="button"
                    onClick={() => { setExpanded(open ? "" : t.id); setEditing(""); }}
                    className={`w-full flex items-center gap-2 p-3 text-left transition-colors ${open ? "bg-black text-white" : "hover:bg-secondary"}`}
                  >
                    {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                    <span className="font-semibold uppercase tracking-wide text-sm flex-1">{t.name}</span>
                    <span className="text-xs opacity-70">{t.eval_date}</span>
                    <span className="text-xs opacity-70">· {count} jug.</span>
                    {t.unit && <span className="text-xs opacity-70">· {t.unit}</span>}
                  </button>

                  {open && (
                    <div className="p-4 border-t border-border">
                      {t.description && <p className="text-xs text-muted-foreground mb-4 border border-border p-3">{t.description}</p>}

                      <div className="border border-border p-3 mb-4">
                        <p className="text-xs uppercase tracking-wider mb-2 font-semibold">Configuración del test</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <Label>Unidad de medida</Label>
                            <Select value={UNITS.some((u) => u.value === t.unit) ? t.unit : "otra"} onValueChange={(v) => { if (v !== "otra") updateTest(t.id, { unit: v }); }}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {UNITS.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                                <SelectItem value="otra">Otra (escribir)</SelectItem>
                              </SelectContent>
                            </Select>
                            {!UNITS.some((u) => u.value === t.unit) && (
                              <Input
                                className="mt-2"
                                defaultValue={t.unit}
                                onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== t.unit) updateTest(t.id, { unit: v }); }}
                                placeholder="Escribí la unidad"
                              />
                            )}
                          </div>
                          <div>
                            <Label>¿Cómo se valoran los resultados?</Label>
                            <Select value={String(t.higher_is_better)} onValueChange={(v) => updateTest(t.id, { higher_is_better: v === "true" })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">Gana el valor más alto (más es mejor)</SelectItem>
                                <SelectItem value="false">Gana el valor más bajo (menos es mejor: tiempos)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>


                      <div className="flex items-center gap-2 mb-4 flex-wrap">
                        {editing === t.id ? (
                          <Button onClick={saveResults} disabled={saving}>{saving ? "Guardando..." : "Guardar resultados"}</Button>
                        ) : (
                          <Button variant="outline" onClick={() => setEditing(t.id)}><Pencil className="h-4 w-4 mr-2" />Editar resultados</Button>
                        )}
                        <Button variant="outline" onClick={exportCsv}><FileDown className="h-4 w-4 mr-2" />CSV</Button>
                        <Button variant="outline" onClick={downloadPdf}><FileDown className="h-4 w-4 mr-2" />PDF</Button>
                        <Button variant="ghost" onClick={() => removeTest(t.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>

                      {editing === t.id ? (
                        <div className="border border-border mb-2 overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-secondary text-xs uppercase tracking-wider">
                              <tr>
                                <th className="p-2 text-left">Jugador</th>
                                <th className="p-2 text-left">Puesto</th>
                                <th className="p-2 text-left w-32">Valor {t.unit ? `(${t.unit})` : ""}</th>
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
                      ) : (
                        <div className="border border-border overflow-x-auto mb-4">
                          <table className="w-full text-sm">
                            <thead className="bg-secondary text-xs uppercase tracking-wider">
                              <tr><th className="p-2 text-left">#</th><th className="p-2 text-left">Jugador</th><th className="p-2">Puesto</th><th className="p-2">Valor</th><th className="p-2 text-left">Notas</th></tr>
                            </thead>
                            <tbody>
                              {detailRows.length === 0 ? (
                                <tr><td colSpan={5} className="p-3 text-sm text-muted-foreground">Sin resultados cargados. Tocá “Editar resultados”.</td></tr>
                              ) : detailRows.map((r, i) => (
                                <tr key={r.user_id} className="border-t border-border">
                                  <td className="p-2 font-display">{i + 1}</td>
                                  <td className="p-2">{r.name}</td>
                                  <td className="p-2 text-center text-xs text-muted-foreground">{r.position}</td>
                                  <td className="p-2 text-center font-display">{r.value} {t.unit}</td>
                                  <td className="p-2 text-xs text-muted-foreground">{r.notes}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <div ref={posChartRef} className="border border-border p-4 mb-4 bg-background">
                        <h3 className="text-lg mb-1">Comparación por puesto</h3>
                        {byPosition.length === 0 ? <p className="text-sm text-muted-foreground">Sin resultados cargados.</p> : (
                          <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={byPosition}>
                              <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
                              <XAxis dataKey="position" stroke="#000" fontSize={10} />
                              <YAxis stroke="#000" fontSize={11} />
                              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #000", borderRadius: 0 }} />
                              <Legend />
                              <Bar dataKey="promedio" fill="#000" name={`Promedio ${t.unit ?? ""}`} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>

                      <div ref={evoChartRef} className="border border-border p-4 bg-background">
                        <h3 className="text-lg mb-1">Evolución del test</h3>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Promedio del plantel cada vez que se repitió “{t.name}”</p>
                        {evolution.length < 2 ? <p className="text-sm text-muted-foreground">Repetí el test con el mismo nombre para ver la evolución.</p> : (
                          <ResponsiveContainer width="100%" height={240}>
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
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ---- Hoja de comparación ---- */}
          <div className="border border-border p-4 sm:p-6 mb-8">
            <h2 className="text-xl mb-1 flex items-center gap-2"><BarChart3 className="h-4 w-4" />Hoja de comparación</h2>
            <p className="text-xs text-muted-foreground mb-4">Elegí uno o más tests. Con uno solo ves los resultados por jugador; con dos o más se comparan entre sí.</p>

            <div className="grid sm:grid-cols-2 gap-1 mb-4 max-h-56 overflow-y-auto border border-border p-2">
              {tests.map((t) => {
                const on = compare.includes(t.id);
                return (
                  <label key={t.id} className={`flex items-center gap-2 p-2 text-sm cursor-pointer ${on ? "bg-black text-white" : "hover:bg-secondary"}`}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => setCompare((c) => (on ? c.filter((x) => x !== t.id) : [...c, t.id]))}
                      className="accent-black"
                    />
                    <span className="flex-1">{t.name}</span>
                    <span className="text-xs opacity-70">{t.eval_date}</span>
                  </label>
                );
              })}
            </div>

            {cmpTests.length === 0 ? (
              <p className="text-sm text-muted-foreground">Seleccioná al menos un test.</p>
            ) : (
              <>
                <div className="flex gap-2 mb-4 flex-wrap">
                  <Button variant="outline" onClick={exportCompareCsv}><FileDown className="h-4 w-4 mr-2" />CSV</Button>
                  <Button variant="outline" onClick={downloadComparePdf}><FileDown className="h-4 w-4 mr-2" />PDF</Button>
                  <Button variant="ghost" onClick={() => setCompare([])}>Limpiar selección</Button>
                </div>

                <div ref={cmpChartRef} className="border border-border p-4 mb-4 bg-background">
                  <h3 className="text-lg mb-3">Promedio por puesto</h3>
                  {cmpByPosition.length === 0 ? <p className="text-sm text-muted-foreground">Sin resultados en los tests elegidos.</p> : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={cmpByPosition}>
                        <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
                        <XAxis dataKey="position" stroke="#000" fontSize={10} />
                        <YAxis stroke="#000" fontSize={11} />
                        <Tooltip contentStyle={{ background: "#fff", border: "1px solid #000", borderRadius: 0 }} />
                        <Legend />
                        {cmpTests.map((t, i) => (
                          <Bar key={t.id} dataKey={t.id} name={cmpLabel(t)} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="border border-border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary text-xs uppercase tracking-wider">
                      <tr>
                        <th className="p-2 text-left">Jugador</th>
                        <th className="p-2">Puesto</th>
                        {cmpTests.map((t) => <th key={t.id} className="p-2 whitespace-nowrap">{t.name}<span className="block font-normal normal-case opacity-70">{t.eval_date} {t.unit ? `(${t.unit})` : ""}</span></th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {cmpAthleteRows.length === 0 ? (
                        <tr><td colSpan={cmpTests.length + 2} className="p-3 text-sm text-muted-foreground">Sin resultados cargados.</td></tr>
                      ) : cmpAthleteRows.map((r) => (
                        <tr key={r.id} className="border-t border-border">
                          <td className="p-2"><Link to="/coach/atleta/$id" params={{ id: r.id }} className="hover:underline">{r.name}</Link></td>
                          <td className="p-2 text-center text-xs text-muted-foreground">{r.position}</td>
                          {cmpTests.map((t) => <td key={t.id} className="p-2 text-center font-display">{r[t.id] ?? "—"}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </Shell>
  );
}
