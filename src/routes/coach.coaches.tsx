import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Shell } from "@/components/Shell";
import { Protected } from "@/lib/protected";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Check, X, ShieldCheck } from "lucide-react";
import { RugbyLoader } from "@/components/RugbyLoader";
import { COACH_TYPES, coachTypeLabel } from "@/lib/positions";
import { listCoachApplications, decideCoachApplication } from "@/lib/coach-approval.functions";

const ADMIN_EMAIL = "agustincapoccetti@hotmail.com";

export const Route = createFileRoute("/coach/coaches")({
  component: () => <Protected requireRole="coach"><Page /></Protected>,
});

type App = {
  user_id: string;
  email: string;
  full_name: string | null;
  coach_type: string;
  status: string;
  created_at: string;
};

function Page() {
  const { user } = useAuth();
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;
  const load = useServerFn(listCoachApplications);
  const decide = useServerFn(decideCoachApplication);

  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [types, setTypes] = useState<Record<string, string>>({});

  async function refresh() {
    setLoading(true);
    try {
      const data = (await load()) as App[];
      setApps(data);
      setTypes(Object.fromEntries(data.map((a) => [a.user_id, a.coach_type])));
    } catch (e: any) {
      toast.error(e.message ?? "Error al cargar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (isAdmin) refresh(); /* eslint-disable-next-line */ }, [isAdmin]);

  if (!isAdmin) {
    return (
      <Shell title="Coaches">
        <p className="text-sm text-muted-foreground">Solo el administrador puede validar coaches.</p>
      </Shell>
    );
  }

  async function onDecide(userId: string, decision: "approved" | "rejected") {
    try {
      await decide({ data: { userId, decision, coachType: types[userId] } });
      toast.success(decision === "approved" ? "Coach habilitado" : "Solicitud rechazada");
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo actualizar");
    }
  }

  const pending = apps.filter((a) => a.status === "pending");
  const decided = apps.filter((a) => a.status !== "pending");

  return (
    <Shell title="Validación de coaches">
      <p className="text-sm text-muted-foreground mb-6">
        Cualquier persona puede registrarse como coach, pero su perfil queda pendiente hasta que tú lo valides.
        Categorías disponibles: preparador físico, fisio y entrenador.
      </p>

      {loading ? (
        <div className="py-12 flex justify-center"><RugbyLoader /></div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="h-4 w-4" />
            <h2 className="text-sm uppercase tracking-wider font-semibold">Pendientes ({pending.length})</h2>
          </div>
          <div className="border border-border mb-8">
            {pending.length === 0 && <p className="px-4 py-6 text-sm text-muted-foreground">Sin solicitudes pendientes.</p>}
            {pending.map((a) => (
              <div key={a.user_id} className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border last:border-0">
                <div className="min-w-[180px] flex-1">
                  <p className="text-sm font-medium">{a.full_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{a.email}</p>
                </div>
                <Select value={types[a.user_id] ?? a.coach_type} onValueChange={(v) => setTypes((t) => ({ ...t, [a.user_id]: v }))}>
                  <SelectTrigger className="h-9 w-[190px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COACH_TYPES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={() => onDecide(a.user_id, "approved")}>
                  <Check className="h-4 w-4 mr-1" /> Habilitar
                </Button>
                <Button size="sm" variant="outline" onClick={() => onDecide(a.user_id, "rejected")}>
                  <X className="h-4 w-4 mr-1" /> Rechazar
                </Button>
              </div>
            ))}
          </div>

          <h2 className="text-sm uppercase tracking-wider font-semibold mb-3">Historial ({decided.length})</h2>
          <div className="border border-border">
            {decided.length === 0 && <p className="px-4 py-6 text-sm text-muted-foreground">Sin decisiones aún.</p>}
            {decided.map((a) => (
              <div key={a.user_id} className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border last:border-0 text-sm">
                <div className="min-w-[180px] flex-1">
                  <p className="font-medium">{a.full_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{a.email}</p>
                </div>
                <span className="text-xs">{coachTypeLabel(a.coach_type)}</span>
                <span className={"text-xs px-2 py-1 border " + (a.status === "approved" ? "border-black" : "border-border text-muted-foreground")}>
                  {a.status === "approved" ? "Habilitado" : "Rechazado"}
                </span>
                {a.status === "rejected" && (
                  <Button size="sm" variant="outline" onClick={() => onDecide(a.user_id, "approved")}>Habilitar</Button>
                )}
                {a.status === "approved" && (
                  <Button size="sm" variant="ghost" onClick={() => onDecide(a.user_id, "rejected")}>Quitar acceso</Button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </Shell>
  );
}
