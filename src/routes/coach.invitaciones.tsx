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
import { Trash2 } from "lucide-react";

const ADMIN_EMAIL = "agustincapoccetti@hotmail.com";

export const Route = createFileRoute("/coach/invitaciones")({
  component: () => <Protected requireRole="coach"><Page /></Protected>,
});

function Page() {
  const { user } = useAuth();
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;
  const [email, setEmail] = useState("");
  const [list, setList] = useState<any[]>([]);
  const [coachCount, setCoachCount] = useState(0);
  const MAX = 5;

  async function load() {
    const { data } = await supabase.from("coach_invites").select("*").order("created_at", { ascending: false });
    setList(data ?? []);
    const { count } = await supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "coach");
    // Subtract admin if present
    setCoachCount((count ?? 0) - 1);
  }

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  if (!isAdmin) {
    return <Shell title="Invitaciones"><p className="text-sm text-muted-foreground">Solo el administrador puede gestionar invitaciones.</p></Shell>;
  }

  async function add() {
    const e = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(e)) { toast.error("Email inválido"); return; }
    if (coachCount >= MAX) { toast.error(`Ya hay ${MAX} coaches activos`); return; }
    const { error } = await supabase.from("coach_invites").insert({ email: e, created_by: user!.id });
    if (error) { toast.error(error.message); return; }
    toast.success("Invitación creada");
    setEmail("");
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("coach_invites").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  }

  return (
    <Shell title="Invitaciones de coach">
      <p className="text-sm text-muted-foreground mb-6">
        Solo los emails de esta lista (más vos como admin) pueden registrarse como coach. Máximo {MAX} coaches.
      </p>

      <div className="border border-border p-6 mb-6">
        <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="e">Email a invitar</Label>
            <Input id="e" type="email" value={email} onChange={(ev) => setEmail(ev.target.value)} placeholder="coach@email.com" />
          </div>
          <Button onClick={add}>Invitar</Button>
        </div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Coaches actuales: {Math.max(0, coachCount)} / {MAX}
        </p>
      </div>

      <div className="border border-border">
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-3 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
          <div>Email</div><div>Estado</div><div></div>
        </div>
        {list.length === 0 && <p className="px-4 py-6 text-sm text-muted-foreground">Sin invitaciones</p>}
        {list.map((inv) => (
          <div key={inv.id} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center px-4 py-3 border-b border-border last:border-0">
            <div className="text-sm">{inv.email}</div>
            <div className="text-xs font-display uppercase">{inv.used ? "Usada" : "Pendiente"}</div>
            <Button variant="ghost" size="sm" onClick={() => remove(inv.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
    </Shell>
  );
}
