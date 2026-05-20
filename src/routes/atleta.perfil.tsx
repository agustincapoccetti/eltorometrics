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
  const [history, setHistory] = useState<any[]>([]);
  const [newWeight, setNewWeight] = useState("");

  async function load() {
    if (!user) return;
    const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(p);
    const { data: h } = await supabase.from("weight_history").select("*").eq("user_id", user.id).order("recorded_at", { ascending: true });
    setHistory((h ?? []).map((x) => ({ date: new Date(x.recorded_at).toLocaleDateString("es"), weight: Number(x.weight) })));
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
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Atleta</p>
            <h2 className="text-3xl mt-1">{profile.full_name}</h2>
            {profile.position && <p className="text-sm text-muted-foreground mt-1">{profile.position}</p>}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
              <Stat label="Peso" value={profile.weight ? `${profile.weight} kg` : "—"} />
              <Stat label="Altura" value={profile.height ? `${profile.height} cm` : "—"} />
              <Stat label="IMC" value={bmi ?? "—"} />
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

          {history.length > 1 && (
            <div className="border border-border p-6">
              <h3 className="text-lg mb-4">Evolución del peso</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={history}>
                  <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="#000" fontSize={11} />
                  <YAxis stroke="#000" fontSize={11} domain={["dataMin - 2", "dataMax + 2"]} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #000", borderRadius: 0 }} />
                  <Line type="monotone" dataKey="weight" stroke="#000" strokeWidth={2} dot={{ r: 3, fill: "#000" }} />
                </LineChart>
              </ResponsiveContainer>
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
