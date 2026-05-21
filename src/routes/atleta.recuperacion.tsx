import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { Protected } from "@/lib/protected";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/atleta/recuperacion")({
  component: () => <Protected requireRole="atleta"><Recuperacion /></Protected>,
});

function Recuperacion() {
  const { user } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [strategies, setStrategies] = useState<any[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [entryId, setEntryId] = useState<string | null>(null);

  async function loadHistory() {
    if (!user) return;
    const { data } = await supabase.from("recovery_entries").select("entry_date, total_score, max_score").eq("user_id", user.id).order("entry_date", { ascending: true });
    setHistory((data ?? []).map((d) => ({ date: d.entry_date, score: d.total_score, max: d.max_score, pct: d.max_score ? Math.round((d.total_score / d.max_score) * 100) : 0 })));
  }

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from("recovery_strategies").select("*").eq("active", true).order("sort_order");
      setStrategies(s ?? []);
      loadHistory();
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: e } = await supabase.from("recovery_entries").select("*").eq("user_id", user.id).eq("entry_date", date).maybeSingle();
      if (e) {
        setEntryId(e.id);
        setNotes(e.notes ?? "");
        const { data: items } = await supabase.from("recovery_entry_items").select("strategy_id").eq("entry_id", e.id);
        const c: Record<string, boolean> = {};
        (items ?? []).forEach((i) => { c[i.strategy_id] = true; });
        setChecked(c);
      } else {
        setEntryId(null); setChecked({}); setNotes("");
      }
    })();
  }, [user, date]);

  const totalPoints = useMemo(() => strategies.reduce((s, x) => s + (checked[x.id] ? x.points : 0), 0), [checked, strategies]);
  const maxPoints = useMemo(() => strategies.reduce((s, x) => s + x.points, 0), [strategies]);
  const pct = maxPoints ? Math.round((totalPoints / maxPoints) * 100) : 0;

  async function save() {
    if (!user) return;
    setSaving(true);
    let id = entryId;
    if (!id) {
      const { data, error } = await supabase.from("recovery_entries").insert({
        user_id: user.id, entry_date: date, total_score: totalPoints, max_score: maxPoints, notes: notes || null,
      }).select("id").single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      id = data.id;
    } else {
      const { error } = await supabase.from("recovery_entries").update({ total_score: totalPoints, max_score: maxPoints, notes: notes || null }).eq("id", id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      await supabase.from("recovery_entry_items").delete().eq("entry_id", id);
    }
    const items = strategies.filter((s) => checked[s.id]).map((s) => ({
      entry_id: id, strategy_id: s.id, user_id: user.id, points: s.points,
    }));
    if (items.length > 0) {
      const { error } = await supabase.from("recovery_entry_items").insert(items);
      if (error) { toast.error(error.message); setSaving(false); return; }
    }
    setEntryId(id);
    setSaving(false);
    toast.success("Recuperación guardada");
    loadHistory();
  }

  return (
    <Shell title="Recuperación">
      <p className="text-sm text-muted-foreground mb-6">Marcá las estrategias que cumpliste hoy. Cada una suma puntos a tu score.</p>

      <div className="border border-border p-6 mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <Label htmlFor="d" className="text-xs uppercase tracking-wider">Fecha</Label>
            <Input id="d" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-44" />
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Score</p>
            <p className="text-4xl font-display">{totalPoints}<span className="text-lg text-muted-foreground">/{maxPoints}</span></p>
            <p className="text-xs">{pct}% recuperado</p>
          </div>
        </div>

        <div className="space-y-2">
          {strategies.map((s) => (
            <label key={s.id} className={`flex items-start gap-3 p-3 border cursor-pointer transition ${checked[s.id] ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}>
              <Checkbox checked={!!checked[s.id]} onCheckedChange={(v) => setChecked({ ...checked, [s.id]: !!v })} className="mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{s.name}</p>
                  <span className="text-xs font-display">+{s.points}</span>
                </div>
                {s.description && <p className={`text-xs mt-0.5 ${checked[s.id] ? "opacity-80" : "text-muted-foreground"}`}>{s.description}</p>}
              </div>
            </label>
          ))}
        </div>

        <div className="mt-4">
          <Label htmlFor="n">Notas (opcional)</Label>
          <Textarea id="n" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>

        <Button onClick={save} disabled={saving} className="w-full mt-4" size="lg">{saving ? "Guardando..." : entryId ? "Actualizar" : "Guardar"}</Button>
      </div>

      {history.length > 1 && (
        <div className="border border-border p-6">
          <h3 className="text-lg mb-4">Evolución del score (%)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={history}>
              <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="#000" fontSize={11} />
              <YAxis stroke="#000" fontSize={11} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #000", borderRadius: 0 }} />
              <Line type="monotone" dataKey="pct" stroke="#000" strokeWidth={2} dot={{ r: 3, fill: "#000" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Shell>
  );
}
