import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Shell } from "@/components/Shell";
import { SubTabs, PLANTEL_TABS } from "@/components/SubTabs";
import { BodyMap } from "@/components/BodyMap";
import { Protected } from "@/lib/protected";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ArrowLeft, FileDown, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { POSITIONS } from "@/lib/positions";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { rpeColor, wellnessColor } from "@/lib/score-colors";
import { exportPdf } from "@/lib/pdf-export";


export const Route = createFileRoute("/coach/atleta/$id")({
  component: () => <Protected requireRole="coach"><AthleteDetail /></Protected>,
});

function AthleteDetail() {
  const { id } = Route.useParams();
  const [profile, setProfile] = useState<any>(null);
  const [editName, setEditName] = useState(false);
  const [nameForm, setNameForm] = useState({ full_name: "", last_name: "" });

  const [rpe, setRpe] = useState<any[]>([]);
  const [wellness, setWellness] = useState<any[]>([]);
  const [weights, setWeights] = useState<any[]>([]);
  const [recovery, setRecovery] = useState<any[]>([]);
  const [physio, setPhysio] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [matchStats, setMatchStats] = useState<{ totalMinutes: number; matches: number; injuries: number; rows: any[] }>({ totalMinutes: 0, matches: 0, injuries: 0, rows: [] });

  const rpeChartRef = useRef<HTMLDivElement>(null);
  const wellChartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("id", id).single();
      setProfile(p);
      const { data: r } = await supabase.from("rpe_entries").select("*").eq("user_id", id).order("session_date");
      setRpe((r ?? []).map((x) => ({ date: x.session_date, value: x.rpe_score, label: x.session_label })));
      const { data: w } = await supabase.from("wellness_entries").select("*").eq("user_id", id).order("entry_date");
      setWellness((w ?? []).map((x) => ({ date: x.entry_date, sleep: x.sleep, stress: x.stress, fatigue: x.fatigue, mood: x.mood, has_pain: x.has_pain, pain_description: x.pain_description })));
      const { data: wh } = await supabase.from("weight_history").select("*").eq("user_id", id).order("recorded_at");
      setWeights((wh ?? []).map((x) => ({ date: new Date(x.recorded_at).toLocaleDateString("es"), weight: Number(x.weight) })));
      const { data: rec } = await supabase.from("recovery_entries").select("entry_date, total_score, max_score").eq("user_id", id).order("entry_date");
      setRecovery((rec ?? []).map((x) => ({ date: x.entry_date, pct: x.max_score ? Math.round((x.total_score / x.max_score) * 100) : 0 })));
      const { data: ph } = await supabase.from("physio_appointments").select("*").eq("user_id", id).order("appointment_date", { ascending: false });
      setPhysio(ph ?? []);
      const { data: att } = await supabase.from("attendance").select("attendance_date, present").eq("user_id", id).eq("present", true).order("attendance_date", { ascending: false });
      setAttendance(att ?? []);
      const { data: mps } = await supabase.from("match_participations").select("match_id, minutes_played, convoked, injury, injury_note").eq("user_id", id);
      const matchIds = Array.from(new Set((mps ?? []).map((m: any) => m.match_id)));
      let mlookup: Record<string, any> = {};
      if (matchIds.length) {
        const { data: ms } = await supabase.from("matches").select("id, match_date, opponent").in("id", matchIds);
        (ms ?? []).forEach((m: any) => { mlookup[m.id] = m; });
      }
      const rows = (mps ?? []).map((p: any) => ({ ...p, match: mlookup[p.match_id] }))
        .sort((a: any, b: any) => (b.match?.match_date ?? "").localeCompare(a.match?.match_date ?? ""));
      const totalMinutes = rows.reduce((s: number, r: any) => s + (r.minutes_played ?? 0), 0);
      const played = rows.filter((r: any) => r.minutes_played > 0).length;
      const injuries = rows.filter((r: any) => r.injury).length;
      setMatchStats({ totalMinutes, matches: played, injuries, rows });
    })();
  }, [id]);

  const bmi = profile?.weight && profile?.height ? (profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1) : null;
  const fullName = profile ? `${profile.full_name}${profile.last_name ? " " + profile.last_name : ""}` : "";

  async function downloadPdf() {
    await exportPdf({
      title: `Informe · ${fullName}`,
      subtitle: `${profile?.position ?? "—"} · ${profile?.weight ?? "—"} kg · ${profile?.height ?? "—"} cm${bmi ? ` · IMC ${bmi}` : ""}`,
      chartEls: [rpeChartRef.current, wellChartRef.current].filter(Boolean) as HTMLElement[],
      tables: [
        { title: "Últimos RPE", head: ["Fecha", "Sesión", "RPE"], rows: rpe.slice(-30).reverse().map((r: any) => [r.date, r.label ?? "—", r.value]) },
        { title: "Últimos Bienestar", head: ["Fecha", "Sueño", "Estrés", "Fatiga", "Ánimo", "Dolor"], rows: wellness.slice(-30).reverse().map((w: any) => [w.date, w.sleep, w.stress, w.fatigue, w.mood, w.has_pain ? (w.pain_description ?? "Sí") : "—"]) },
        { title: "Recuperación %", head: ["Fecha", "Score %"], rows: recovery.slice(-30).reverse().map((r: any) => [r.date, r.pct]) },
        { title: "Citas con fisio", head: ["Fecha", "Estado", "Motivos", "Notas"], rows: physio.map((a) => [a.appointment_date, a.status, (a.reasons ?? []).join(" · "), a.notes ?? ""]) },
      ],
      filename: `atleta_${fullName.replace(/\s+/g, "_")}.pdf`,
    });
  }

  return (
    <Shell>
      <SubTabs tabs={PLANTEL_TABS} />
      <div className="flex items-center justify-between mb-4">
        <Link to="/coach" className="inline-flex items-center gap-1 text-xs uppercase tracking-wider hover:underline">
          <ArrowLeft className="h-3 w-3" /> Volver
        </Link>
        <div className="flex items-center gap-2">
          {profile && isAdmin && (
            <Button size="sm" variant="outline" onClick={() => {
              setEditForm({
                full_name: profile.full_name ?? "",
                last_name: profile.last_name ?? "",
                position: profile.position ?? "",
                weight: profile.weight != null ? String(profile.weight) : "",
                height: profile.height != null ? String(profile.height) : "",
                age: profile.age != null ? String(profile.age) : "",
              });
              setEditOpen(true);
            }}><Pencil className="h-4 w-4 mr-1" />Editar perfil</Button>
          )}
          {profile && <Button size="sm" onClick={downloadPdf}><FileDown className="h-4 w-4 mr-1" />PDF</Button>}
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar perfil del jugador</DialogTitle>
            <DialogDescription>Solo el administrador puede modificar estos datos.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nombre</Label>
                <Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Apellido</Label>
                <Input value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Puesto</Label>
              <Select value={editForm.position || undefined} onValueChange={(v) => setEditForm({ ...editForm, position: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar puesto" /></SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Peso (kg)</Label>
                <Input type="number" step="0.1" value={editForm.weight} onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Altura (cm)</Label>
                <Input type="number" step="0.1" value={editForm.height} onChange={(e) => setEditForm({ ...editForm, height: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Edad</Label>
                <Input type="number" value={editForm.age} onChange={(e) => setEditForm({ ...editForm, age: e.target.value })} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">La foto se cambia tocando la imagen del perfil.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={async () => {
              const payload: any = {
                full_name: editForm.full_name.trim(),
                last_name: editForm.last_name.trim() || null,
                position: editForm.position || null,
                weight: editForm.weight === "" ? null : Number(editForm.weight),
                height: editForm.height === "" ? null : Number(editForm.height),
                age: editForm.age === "" ? null : Number(editForm.age),
              };
              const { error } = await supabase.from("profiles").update(payload).eq("id", id);
              if (error) { toast.error(error.message); return; }
              setProfile({ ...profile, ...payload });
              setEditOpen(false);
              toast.success("Perfil actualizado");
            }}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {profile && (
        <>
          <div className="mb-8 flex items-start gap-4">
            <label className="w-24 h-24 border border-border bg-secondary overflow-hidden flex-shrink-0 cursor-pointer block">
              {profile.photo_url ? <img src={profile.photo_url} alt={fullName} className="w-full h-full object-cover" /> : null}
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 5 * 1024 * 1024) { toast.error("Foto muy grande (máx 5MB)"); return; }
                const ext = f.name.split(".").pop() || "jpg";
                const path = `${id}/avatar.${ext}`;
                const { error: upErr } = await supabase.storage.from("athlete-photos").upload(path, f, { upsert: true, cacheControl: "3600" });
                if (upErr) { toast.error(upErr.message); return; }
                const { data: pub } = supabase.storage.from("athlete-photos").getPublicUrl(path);
                const url = `${pub.publicUrl}?t=${Date.now()}`;
                const { error } = await supabase.from("profiles").update({ photo_url: url }).eq("id", id);
                if (error) { toast.error(error.message); return; }
                setProfile({ ...profile, photo_url: url });
                toast.success("Foto actualizada");
              }} />
            </label>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Atleta</p>
              {editName ? (
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Input className="w-32" value={nameForm.full_name} onChange={(e) => setNameForm({ ...nameForm, full_name: e.target.value })} placeholder="Nombre" />
                  <Input className="w-32" value={nameForm.last_name} onChange={(e) => setNameForm({ ...nameForm, last_name: e.target.value })} placeholder="Apellido" />
                  <Button size="sm" onClick={async () => {
                    const { error } = await supabase.from("profiles").update({ full_name: nameForm.full_name, last_name: nameForm.last_name }).eq("id", id);
                    if (error) { toast.error(error.message); return; }
                    setProfile({ ...profile, ...nameForm });
                    setEditName(false);
                    toast.success("Nombre actualizado");
                  }}>Guardar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditName(false)}>Cancelar</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <h1 className="text-4xl">{fullName}</h1>
                  <Button size="sm" variant="ghost" onClick={() => { setNameForm({ full_name: profile.full_name ?? "", last_name: profile.last_name ?? "" }); setEditName(true); }}>Editar</Button>
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                {profile.position ?? "—"}{profile.age ? ` · ${profile.age} años` : ""} · {profile.weight ?? "—"} kg · {profile.height ?? "—"} cm{bmi && ` · IMC ${bmi}`}
              </p>
            </div>
          </div>


          <div ref={rpeChartRef} className="bg-background">
            <Chart title="RPE" data={rpe} keys={[{ key: "value", name: "RPE" }]} domain={[0, 10]} />
          </div>

          <ScoreList title="Últimos RPE" items={rpe.slice(-12).reverse()} kind="rpe" />

          <div ref={wellChartRef} className="bg-background">
            <Chart title="Bienestar (1 mejor · 5 peor)" data={wellness} keys={[
              { key: "sleep", name: "Sueño", stroke: "#000" },
              { key: "stress", name: "Estrés", stroke: "#555" },
              { key: "fatigue", name: "Fatiga", stroke: "#888" },
              { key: "mood", name: "Ánimo", stroke: "#bbb" },
            ]} domain={[1, 5]} />
          </div>

          <ScoreList title="Últimos Bienestar" items={wellness.slice(-12).reverse()} kind="wellness" />

          <Chart title="Recuperación (%)" data={recovery} keys={[{ key: "pct", name: "Score %" }]} domain={[0, 100]} />
          {weights.length > 1 && <Chart title="Peso" data={weights} keys={[{ key: "weight", name: "kg" }]} />}

          <SectionList title="Últimas molestias" items={
            wellness.filter((w: any) => w.has_pain).slice(-5).reverse()
              .map((w: any) => ({ date: w.date, text: w.pain_description ?? "—" }))
          } />

          <div className="border border-border p-6 mt-4">
            <h3 className="text-lg mb-3">Presentismo y partidos</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 text-center">
              <div className="border border-border p-2"><p className="text-[10px] uppercase text-muted-foreground">Entrenos (año)</p><p className="text-xl font-medium">{attendance.length}</p></div>
              <div className="border border-border p-2"><p className="text-[10px] uppercase text-muted-foreground">Partidos jugados</p><p className="text-xl font-medium">{matchStats.matches}</p></div>
              <div className="border border-border p-2"><p className="text-[10px] uppercase text-muted-foreground">Minutos totales</p><p className="text-xl font-medium">{matchStats.totalMinutes}'</p></div>
              <div className="border border-border p-2"><p className="text-[10px] uppercase text-muted-foreground">Lesiones</p><p className="text-xl font-medium">{matchStats.injuries}</p></div>
            </div>
            {matchStats.rows.length > 0 && (
              <div className="space-y-1.5">
                {matchStats.rows.slice(0, 8).map((r: any, idx: number) => (
                  <div key={idx} className="text-xs border-l-2 border-primary pl-3">
                    <p className="font-display uppercase tracking-wider">{r.match?.match_date ?? "—"} · {r.match?.opponent ?? "Sin rival"}</p>
                    <p>{r.minutes_played ?? 0}' {r.convoked ? "· convocado" : ""} {r.injury ? `· lesión${r.injury_note ? ": " + r.injury_note : ""}` : ""}</p>
                  </div>
                ))}
              </div>
            )}
          </div>


          <BodyMap
            entries={[
              ...physio.flatMap((a: any) => ((a.reasons ?? []) as string[]).map((r) => ({ text: r, date: a.appointment_date }))),
              ...physio.filter((a: any) => a.notes).map((a: any) => ({ text: a.notes as string, date: a.appointment_date })),
              ...wellness.filter((w: any) => w.has_pain && w.pain_description).map((w: any) => ({ text: w.pain_description as string, date: w.date })),
            ]}
            title="Zonas de dolor del atleta"
          />

          {physio.length > 0 && (
            <div className="border border-border p-6 mt-4">
              <h3 className="text-lg mb-4">Citas con fisio ({physio.length})</h3>
              <div className="space-y-2">
                {physio.slice(0, 8).map((a) => (
                  <div key={a.id} className="border-l-2 border-primary pl-3">
                    <p className="text-xs uppercase tracking-wider font-display">{a.appointment_date} · {a.status}</p>
                    <p className="text-sm">{(a.reasons ?? []).join(" · ")}</p>
                    {a.notes && <p className="text-xs italic text-muted-foreground">{a.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}

function ScoreList({ title, items, kind }: { title: string; items: any[]; kind: "rpe" | "wellness" }) {
  if (!items.length) return null;
  return (
    <div className="border border-border p-6 mb-4">
      <h3 className="text-lg mb-3">{title}</h3>
      <div className="space-y-1.5">
        {items.map((it: any, idx: number) => {
          if (kind === "rpe") {
            const c = rpeColor(it.value);
            return (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-xs font-display uppercase tracking-wider w-20 text-muted-foreground">{it.date}</span>
                <span className={`inline-flex items-center justify-center w-10 h-7 text-sm font-medium ${c.bg} ${c.text}`}>{it.value}</span>
                <span className="text-xs">{c.label}{it.label ? ` · ${it.label}` : ""}</span>
              </div>
            );
          }
          const avg = +(((it.sleep + it.stress + it.fatigue + it.mood) / 4)).toFixed(1);
          return (
            <div key={idx} className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-display uppercase tracking-wider w-20 text-muted-foreground">{it.date}</span>
              {(["sleep", "stress", "fatigue", "mood"] as const).map((k) => {
                const c = wellnessColor(it[k]);
                const label = { sleep: "Sue", stress: "Est", fatigue: "Fat", mood: "Áni" }[k];
                return (
                  <span key={k} className={`inline-flex flex-col items-center px-2 py-0.5 ${c.bg} ${c.text}`}>
                    <span className="text-[9px] uppercase tracking-wider leading-none">{label}</span>
                    <span className="text-sm font-medium leading-tight">{it[k]}</span>
                  </span>
                );
              })}
              <span className="text-xs text-muted-foreground ml-1">μ {avg}</span>
              {it.has_pain && <span className="text-[10px] uppercase tracking-wider bg-red-600 text-white px-1.5 py-0.5">Dolor</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Chart({ title, data, keys, domain }: any) {
  return (
    <div className="border border-border p-6 mb-4">
      <h3 className="text-lg mb-4">{title}</h3>
      {data.length === 0 ? <p className="text-sm text-muted-foreground">Sin datos.</p> : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke="#000" fontSize={11} />
            <YAxis stroke="#000" fontSize={11} domain={domain ?? ["auto", "auto"]} />
            <Tooltip contentStyle={{ background: "#fff", border: "1px solid #000", borderRadius: 0 }} />
            {keys.map((k: any) => (
              <Line key={k.key} type="monotone" dataKey={k.key} name={k.name} stroke={k.stroke ?? "#000"} strokeWidth={2} dot={{ r: 2 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function SectionList({ title, items }: { title: string; items: { date: string; text: string }[] }) {
  if (!items.length) return null;
  return (
    <div className="border border-border p-6 mt-4">
      <h3 className="text-lg mb-4">{title}</h3>
      <ul className="space-y-2">
        {items.map((i, idx) => (
          <li key={idx} className="text-sm border-l-2 border-primary pl-3">
            <span className="font-display text-xs uppercase tracking-wider">{i.date}</span>
            <p className="text-foreground mt-0.5">{i.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
