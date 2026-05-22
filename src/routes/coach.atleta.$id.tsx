import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Shell } from "@/components/Shell";
import { Protected } from "@/lib/protected";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ArrowLeft, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { rpeColor, wellnessColor } from "@/lib/score-colors";
import { exportPdf } from "@/lib/pdf-export";

export const Route = createFileRoute("/coach/atleta/$id")({
  component: () => <Protected requireRole="coach"><AthleteDetail /></Protected>,
});

function AthleteDetail() {
  const { id } = Route.useParams();
  const [profile, setProfile] = useState<any>(null);
  const [rpe, setRpe] = useState<any[]>([]);
  const [wellness, setWellness] = useState<any[]>([]);
  const [weights, setWeights] = useState<any[]>([]);
  const [recovery, setRecovery] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("id", id).single();
      setProfile(p);
      const { data: r } = await supabase.from("rpe_entries").select("*").eq("user_id", id).order("session_date");
      setRpe((r ?? []).map((x) => ({ date: x.session_date, value: x.rpe_score })));
      const { data: w } = await supabase.from("wellness_entries").select("*").eq("user_id", id).order("entry_date");
      setWellness((w ?? []).map((x) => ({ date: x.entry_date, sleep: x.sleep, stress: x.stress, fatigue: x.fatigue, mood: x.mood, has_pain: x.has_pain, pain_description: x.pain_description })));
      const { data: wh } = await supabase.from("weight_history").select("*").eq("user_id", id).order("recorded_at");
      setWeights((wh ?? []).map((x) => ({ date: new Date(x.recorded_at).toLocaleDateString("es"), weight: Number(x.weight) })));
      const { data: rec } = await supabase.from("recovery_entries").select("entry_date, total_score, max_score").eq("user_id", id).order("entry_date");
      setRecovery((rec ?? []).map((x) => ({ date: x.entry_date, pct: x.max_score ? Math.round((x.total_score / x.max_score) * 100) : 0 })));
    })();
  }, [id]);

  const bmi = profile?.weight && profile?.height ? (profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1) : null;
  const fullName = profile ? `${profile.full_name}${profile.last_name ? " " + profile.last_name : ""}` : "";

  return (
    <Shell>
      <Link to="/coach" className="inline-flex items-center gap-1 text-xs uppercase tracking-wider mb-4 hover:underline">
        <ArrowLeft className="h-3 w-3" /> Volver
      </Link>
      {profile && (
        <>
          <div className="mb-8 flex items-start gap-4">
            <div className="w-24 h-24 border border-border bg-secondary overflow-hidden flex-shrink-0">
              {profile.photo_url ? <img src={profile.photo_url} alt={fullName} className="w-full h-full object-cover" /> : null}
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Atleta</p>
              <h1 className="text-4xl mt-1">{fullName}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {profile.position ?? "—"}{profile.age ? ` · ${profile.age} años` : ""} · {profile.weight ?? "—"} kg · {profile.height ?? "—"} cm{bmi && ` · IMC ${bmi}`}
              </p>
            </div>
          </div>

          <Chart title="RPE" data={rpe} keys={[{ key: "value", name: "RPE" }]} domain={[0, 10]} />
          <Chart title="Bienestar (1 mejor · 5 peor)" data={wellness} keys={[
            { key: "sleep", name: "Sueño", stroke: "#000" },
            { key: "stress", name: "Estrés", stroke: "#555" },
            { key: "fatigue", name: "Fatiga", stroke: "#888" },
            { key: "mood", name: "Ánimo", stroke: "#bbb" },
          ]} domain={[1, 5]} />
          <Chart title="Recuperación (%)" data={recovery} keys={[{ key: "pct", name: "Score %" }]} domain={[0, 100]} />
          {weights.length > 1 && <Chart title="Peso" data={weights} keys={[{ key: "weight", name: "kg" }]} />}

          <SectionList title="Últimas molestias" items={
            wellness.filter((w: any) => w.has_pain).slice(-5).reverse()
              .map((w: any) => ({ date: w.date, text: w.pain_description ?? "—" }))
          } />
        </>
      )}
    </Shell>
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
