import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { Protected } from "@/lib/protected";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/atleta/perfil")({ component: () => <Protected requireRole="atleta"><Perfil /></Protected> });

function Perfil() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [editName, setEditName] = useState(false);
  const [nameForm, setNameForm] = useState({ full_name: "", last_name: "" });
  const [history, setHistory] = useState<any[]>([]);
  const [newWeight, setNewWeight] = useState("");
  const [matchStats, setMatchStats] = useState({ totalMinutes: 0, matches: 0, injuries: 0 });
  const [attendanceYear, setAttendanceYear] = useState(0);

  async function changePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !user) return;
    if (f.size > 5 * 1024 * 1024) { toast.error("Foto muy grande (máx 5MB)"); return; }
    const ext = f.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from("athlete-photos").upload(path, f, { upsert: true, cacheControl: "3600" });
    if (upErr) { toast.error(upErr.message); return; }
    const { data: pub } = supabase.storage.from("athlete-photos").getPublicUrl(path);
    const url = `${pub.publicUrl}?t=${Date.now()}`;
    const { error } = await supabase.from("profiles").update({ photo_url: url }).eq("id", user.id);
    if (error) { toast.error(error.message); return; }
    setProfile((p: any) => ({ ...p, photo_url: url }));
    toast.success("Foto actualizada");
  }

  async function saveName() {
    if (!user) return;
    if (!nameForm.full_name.trim()) { toast.error("El nombre no puede estar vacío"); return; }
    const { error } = await supabase.from("profiles").update({ full_name: nameForm.full_name, last_name: nameForm.last_name }).eq("id", user.id);
    if (error) { toast.error(error.message); return; }
    setProfile((p: any) => ({ ...p, ...nameForm }));
    setEditName(false);
    toast.success("Nombre actualizado");
  }


  async function load() {
    if (!user) return;
    const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(p);
    const { data: h } = await supabase.from("weight_history").select("*").eq("user_id", user.id).order("recorded_at", { ascending: true });
    setHistory((h ?? []).map((x) => ({ id: x.id, date: new Date(x.recorded_at).toLocaleDateString("es"), weight: Number(x.weight) })));
    const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
    const { data: att } = await supabase.from("attendance").select("attendance_date").eq("user_id", user.id).eq("present", true).gte("attendance_date", yearStart);
    setAttendanceYear((att ?? []).length);
    const { data: mps } = await supabase.from("match_participations").select("minutes_played, injury").eq("user_id", user.id);
    const total = (mps ?? []).reduce((s: number, r: any) => s + (r.minutes_played ?? 0), 0);
    const matches = (mps ?? []).filter((r: any) => r.minutes_played > 0).length;
    const injuries = (mps ?? []).filter((r: any) => r.injury).length;
    setMatchStats({ totalMinutes: total, matches, injuries });
  }

  useEffect(() => { load(); }, [user]);

  async function saveWeight() {
    const w = parseFloat(newWeight);
    if (!w || w < 30 || w > 200) { toast.error("Peso inválido"); return; }
    const { error: e1 } = await supabase.from("profiles").update({ weight: w, last_weight_update: new Date().toISOString() }).eq("id", user!.id);
    const { error: e2 } = await supabase.from("weight_history").insert({ user_id: user!.id, weight: w });
    if (e1 || e2) { toast.error("Error"); return; }
    toast.success("Peso registrado");
    setNewWeight("");
    load();
  }

  const bmi = profile?.weight && profile?.height ? (profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1) : null;
  const daysSinceUpdate = profile?.last_weight_update
    ? Math.floor((Date.now() - new Date(profile.last_weight_update).getTime()) / 86400000) : null;

  return (
    <Shell title="Perfil">
      {profile && (
        <>
          <div className="border border-border p-6 mb-6">
            <div className="flex items-start gap-4">
              <label className="w-24 h-24 border border-border bg-secondary overflow-hidden flex-shrink-0 cursor-pointer block">
                {profile.photo_url ? <img src={profile.photo_url} alt={profile.full_name} className="w-full h-full object-cover" /> : null}
                <input type="file" accept="image/*" className="hidden" onChange={changePhoto} />
              </label>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Atleta</p>
                {editName ? (
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Input className="w-32" placeholder="Nombre" value={nameForm.full_name} onChange={(e) => setNameForm({ ...nameForm, full_name: e.target.value })} />
                    <Input className="w-32" placeholder="Apellido" value={nameForm.last_name} onChange={(e) => setNameForm({ ...nameForm, last_name: e.target.value })} />
                    <Button size="sm" onClick={saveName}>Guardar</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditName(false)}>Cancelar</Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <h2 className="text-3xl">{profile.full_name}{profile.last_name ? ` ${profile.last_name}` : ""}</h2>
                    <Button size="sm" variant="ghost" onClick={() => { setNameForm({ full_name: profile.full_name ?? "", last_name: profile.last_name ?? "" }); setEditName(true); }}>Editar</Button>
                  </div>
                )}
                {profile.position && <p className="text-sm text-muted-foreground mt-1">{profile.position}</p>}
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-2">Toca la foto para cambiarla</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
              <Stat label="Peso" value={profile.weight ? `${profile.weight} kg` : "—"} />
              <Stat label="Altura" value={profile.height ? `${profile.height} cm` : "—"} />
              <Stat label="IMC" value={bmi ?? "—"} />
            </div>
          </div>


          <div className="border border-border p-6 mb-6">
            <h3 className="text-lg mb-3">Temporada</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
              <Stat label="Entrenos (año)" value={attendanceYear} />
              <Stat label="Partidos jugados" value={matchStats.matches} />
              <Stat label="Minutos totales" value={`${matchStats.totalMinutes}'`} />
              <Stat label="Lesiones" value={matchStats.injuries} />
            </div>
          </div>

          <div className="border border-border p-6 mb-6">
            <h3 className="text-lg mb-1">Actualizar peso</h3>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
              {daysSinceUpdate !== null ? `Última actualización: hace ${daysSinceUpdate} días` : "Sin registros"}
            </p>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="nw" className="sr-only">Peso</Label>
                <Input id="nw" type="number" step="0.1" placeholder="kg" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} />
              </div>
              <Button onClick={saveWeight}>Guardar</Button>
            </div>
          </div>

          {history.length > 0 && (
            <div className="border border-border p-6">
              <h3 className="text-lg mb-4">Evolución del peso</h3>
              {history.length > 1 && (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={history}>
                    <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
                    <XAxis dataKey="date" stroke="#000" fontSize={11} />
                    <YAxis stroke="#000" fontSize={11} domain={["dataMin - 2", "dataMax + 2"]} />
                    <Tooltip contentStyle={{ background: "#fff", border: "1px solid #000", borderRadius: 0 }} />
                    <Line type="monotone" dataKey="weight" stroke="#000" strokeWidth={2} dot={{ r: 3, fill: "#000" }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
              <div className="mt-4 space-y-1">
                {[...history].reverse().slice(0,10).map((h: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm border-b border-border py-1.5 last:border-0">
                    <span>{h.date}</span>
                    <span className="font-display">{h.weight} kg</span>
                    <Button variant="ghost" size="sm" onClick={async () => {
                      if (!confirm("¿Eliminar este registro?")) return;
                      await supabase.from("weight_history").delete().eq("id", h.id);
                      load();
                    }}>×</Button>
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

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-2xl font-display mt-1">{value}</p>
    </div>
  );
}
