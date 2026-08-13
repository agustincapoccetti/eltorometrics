import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { SubTabs, PLANIFICACION_TABS } from "@/components/SubTabs";
import { Protected } from "@/lib/protected";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/coach/partidos")({
  component: () => <Protected requireRole="coach"><CoachMatches /></Protected>,
});

function lastNameOf(p: any) {
  return (p.last_name?.trim() || p.full_name?.split(" ").slice(-1)[0] || "").toLowerCase();
}

function CoachMatches() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [openNew, setOpenNew] = useState(false);
  const [newMatch, setNewMatch] = useState({ match_date: new Date().toISOString().slice(0,10), opponent: "", location: "", notes: "" });
  const [selected, setSelected] = useState<any | null>(null);
  const [participations, setParticipations] = useState<Record<string, any>>({});

  async function loadAll() {
    const { data: ms } = await supabase.from("matches").select("*").order("match_date", { ascending: false });
    setMatches(ms ?? []);
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "atleta");
    const ids = (roles ?? []).map((r) => r.user_id);
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, last_name, position").in("id", ids);
      setAthletes((profs ?? []).sort((a, b) => lastNameOf(a).localeCompare(lastNameOf(b))));
    }
  }
  useEffect(() => { loadAll(); }, []);

  async function openMatch(m: any) {
    setSelected(m);
    const { data } = await supabase.from("match_participations").select("*").eq("match_id", m.id);
    const map: Record<string, any> = {};
    (data ?? []).forEach((p) => { map[p.user_id] = p; });
    setParticipations(map);
  }

  async function createMatch() {
    if (!newMatch.match_date) { toast.error("Falta fecha"); return; }
    const { data, error } = await supabase.from("matches").insert({ ...newMatch, created_by: user!.id }).select().single();
    if (error) { toast.error(error.message); return; }
    toast.success("Partido creado");
    setOpenNew(false);
    setNewMatch({ match_date: new Date().toISOString().slice(0,10), opponent: "", location: "", notes: "" });
    setMatches((cur) => [data, ...cur]);
    openMatch(data);
  }

  async function deleteMatch(id: string) {
    if (!confirm("¿Eliminar este partido y todas sus participaciones?")) return;
    const { error } = await supabase.from("matches").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setMatches((cur) => cur.filter((m) => m.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  async function upsertPart(uid: string, patch: Partial<{ convoked: boolean; minutes_played: number; injury: boolean; injury_note: string }>) {
    if (!selected) return;
    const existing = participations[uid];
    const merged = { convoked: false, minutes_played: 0, injury: false, injury_note: null as any, ...existing, ...patch };
    if (existing) {
      const { data, error } = await supabase.from("match_participations").update(patch).eq("id", existing.id).select().single();
      if (error) { toast.error(error.message); return; }
      setParticipations((cur) => ({ ...cur, [uid]: data }));
    } else {
      const payload = { match_id: selected.id, user_id: uid, convoked: merged.convoked, minutes_played: merged.minutes_played, injury: merged.injury, injury_note: merged.injury_note };
      const { data, error } = await supabase.from("match_participations").insert(payload).select().single();
      if (error) { toast.error(error.message); return; }
      setParticipations((cur) => ({ ...cur, [uid]: data }));
    }
  }

  const totals = useMemo(() => {
    let conv = 0, played = 0, inj = 0;
    Object.values(participations).forEach((p: any) => {
      if (p.convoked) conv++;
      if (p.minutes_played > 0) played++;
      if (p.injury) inj++;
    });
    return { conv, played, inj };
  }, [participations]);

  return (
    <Shell title="Partidos">
      <SubTabs tabs={PLANIFICACION_TABS} />
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">Convocá jugadores, registrá minutos jugados y lesiones por partido.</p>
        <Button onClick={() => setOpenNew(true)}><Plus className="h-4 w-4 mr-2" />Nuevo partido</Button>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-4">
        <div className="border border-border bg-background">
          <div className="px-3 py-2 border-b border-border text-[10px] uppercase tracking-wider font-medium bg-secondary">Partidos</div>
          {matches.length === 0 && <p className="p-4 text-xs text-muted-foreground">Sin partidos.</p>}
          {matches.map((m) => (
            <button key={m.id} onClick={() => openMatch(m)} className={`w-full text-left px-3 py-2 border-b border-border last:border-b-0 hover:bg-accent flex items-center gap-2 ${selected?.id === m.id ? "bg-accent" : ""}`}>
              <div className="flex-1 text-xs">
                <p className="font-medium">{m.opponent || "Sin rival"}</p>
                <p className="text-[10px] text-muted-foreground">{m.match_date}{m.location ? " · " + m.location : ""}</p>
              </div>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            </button>
          ))}
        </div>

        <div className="border border-border bg-background p-4">
          {!selected && <p className="text-sm text-muted-foreground">Seleccioná un partido para gestionar la convocatoria.</p>}
          {selected && (
            <>
              <div className="flex items-start justify-between mb-3 gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Partido</p>
                  <h2 className="text-xl">{selected.opponent || "Sin rival"}</h2>
                  <p className="text-xs text-muted-foreground">{selected.match_date}{selected.location ? " · " + selected.location : ""}</p>
                  {selected.notes && <p className="text-xs mt-1">{selected.notes}</p>}
                </div>
                <Button size="sm" variant="outline" onClick={() => deleteMatch(selected.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                <div className="border border-border p-2"><p className="text-[10px] uppercase text-muted-foreground">Convocados</p><p className="text-lg font-medium">{totals.conv}</p></div>
                <div className="border border-border p-2"><p className="text-[10px] uppercase text-muted-foreground">Jugaron</p><p className="text-lg font-medium">{totals.played}</p></div>
                <div className="border border-border p-2"><p className="text-[10px] uppercase text-muted-foreground">Lesiones</p><p className="text-lg font-medium">{totals.inj}</p></div>
              </div>

              <div className="overflow-x-auto">
                <div className="grid grid-cols-[1.5fr_0.6fr_0.7fr_0.6fr_1.4fr] gap-2 px-2 py-1.5 border-b border-border bg-secondary text-[10px] uppercase tracking-wider font-medium min-w-[560px]">
                  <div>Jugador</div>
                  <div className="text-center">Conv.</div>
                  <div className="text-center">Min.</div>
                  <div className="text-center">Lesión</div>
                  <div>Detalle lesión</div>
                </div>
                {athletes.map((p) => {
                  const part = participations[p.id] ?? {};
                  return (
                    <div key={p.id} className="grid grid-cols-[1.5fr_0.6fr_0.7fr_0.6fr_1.4fr] gap-2 px-2 py-1.5 border-b border-border last:border-b-0 items-center text-xs min-w-[560px]">
                      <div className="truncate">
                        <p className="font-medium">{(p.last_name ? p.last_name + ", " : "") + p.full_name}</p>
                        <p className="text-[10px] text-muted-foreground">{p.position ?? "—"}</p>
                      </div>
                      <div className="flex justify-center">
                        <Checkbox checked={!!part.convoked} onCheckedChange={(v) => upsertPart(p.id, { convoked: !!v })} />
                      </div>
                      <Input type="number" min={0} max={120} className="h-7 text-xs" value={part.minutes_played ?? 0}
                        onChange={(e) => upsertPart(p.id, { minutes_played: Math.max(0, parseInt(e.target.value || "0")) })} />
                      <div className="flex justify-center">
                        <Checkbox checked={!!part.injury} onCheckedChange={(v) => upsertPart(p.id, { injury: !!v })} />
                      </div>
                      <Input className="h-7 text-xs" placeholder={part.injury ? "Describir lesión" : "—"} value={part.injury_note ?? ""}
                        disabled={!part.injury}
                        onChange={(e) => upsertPart(p.id, { injury_note: e.target.value })} />
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo partido</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Fecha</Label><Input type="date" value={newMatch.match_date} onChange={(e) => setNewMatch({ ...newMatch, match_date: e.target.value })} /></div>
            <div><Label>Rival</Label><Input value={newMatch.opponent} onChange={(e) => setNewMatch({ ...newMatch, opponent: e.target.value })} placeholder="Ej: Hindú" /></div>
            <div><Label>Lugar</Label><Input value={newMatch.location} onChange={(e) => setNewMatch({ ...newMatch, location: e.target.value })} placeholder="Local / Visitante / Cancha" /></div>
            <div><Label>Notas</Label><Textarea value={newMatch.notes} onChange={(e) => setNewMatch({ ...newMatch, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNew(false)}>Cerrar</Button>
            <Button onClick={createMatch}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
