import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Shell } from "@/components/Shell";
import { Protected } from "@/lib/protected";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { POSITIONS } from "@/lib/positions";
import { toast } from "sonner";
import { Trash2, UserPlus, Mail } from "lucide-react";
import { RugbyLoader } from "@/components/RugbyLoader";
import { listUsers, inviteAthlete, deleteUser } from "@/lib/user-admin.functions";

const ADMIN_EMAIL = "agustincapoccetti@hotmail.com";

export const Route = createFileRoute("/coach/usuarios")({
  component: () => <Protected requireRole="coach"><Page /></Protected>,
});

type Row = {
  id: string;
  email: string;
  full_name: string;
  position: string;
  role: string | null;
  confirmed: boolean;
  last_sign_in_at: string | null;
};

function Page() {
  const { user } = useAuth();
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;

  const list = useServerFn(listUsers);
  const invite = useServerFn(inviteAthlete);
  const del = useServerFn(deleteUser);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [position, setPosition] = useState("");
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await list();
      setRows(data as Row[]);
    } catch (e: any) {
      toast.error(e.message ?? "Error al cargar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (isAdmin) load(); /* eslint-disable-next-line */ }, [isAdmin]);

  if (!isAdmin) {
    return (
      <Shell title="Usuarios">
        <p className="text-sm text-muted-foreground">Solo el administrador puede gestionar usuarios.</p>
      </Shell>
    );
  }

  async function onInvite() {
    if (!email.trim()) { toast.error("Ingresá un email"); return; }
    setSending(true);
    try {
      await invite({ data: { email, fullName, position } });
      toast.success("Invitación enviada. El atleta recibirá un email para activar su cuenta.");
      setEmail(""); setFullName(""); setPosition("");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo invitar");
    } finally {
      setSending(false);
    }
  }

  async function onDelete(row: Row) {
    if (!confirm(`¿Eliminar a ${row.full_name || row.email}? Esta acción no se puede deshacer.`)) return;
    try {
      await del({ data: { userId: row.id } });
      toast.success("Usuario eliminado");
      setRows((r) => r.filter((x) => x.id !== row.id));
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo eliminar");
    }
  }

  const f = filter.trim().toLowerCase();
  const filtered = f
    ? rows.filter((r) => r.email.toLowerCase().includes(f) || r.full_name.toLowerCase().includes(f))
    : rows;

  return (
    <Shell title="Gestión de usuarios">
      <p className="text-sm text-muted-foreground mb-6">
        Añade nuevos atletas por email (recibirán un correo de invitación para fijar su contraseña) o elimina usuarios existentes.
      </p>

      <div className="border border-border p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="h-4 w-4" />
          <h2 className="text-sm uppercase tracking-wider font-semibold">Invitar atleta</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_160px_auto] gap-3 items-end">
          <div>
            <Label htmlFor="e">Email *</Label>
            <Input id="e" type="email" value={email} onChange={(ev) => setEmail(ev.target.value)} placeholder="atleta@email.com" />
          </div>
          <div>
            <Label htmlFor="n">Nombre completo</Label>
            <Input id="n" value={fullName} onChange={(ev) => setFullName(ev.target.value)} placeholder="Nombre Apellido" />
          </div>
          <div>
            <Label>Puesto</Label>
            <Select value={position} onValueChange={setPosition}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                {POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={onInvite} disabled={sending}>
            <Mail className="h-4 w-4 mr-2" />
            {sending ? "Enviando..." : "Invitar"}
          </Button>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-sm uppercase tracking-wider font-semibold">Usuarios registrados ({rows.length})</h2>
        <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Buscar por nombre o email" className="max-w-xs" />
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><RugbyLoader /></div>
      ) : (
        <div className="border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Nombre</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Rol</th>
                <th className="text-left px-4 py-3">Puesto</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-3">{r.full_name || <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3">{r.email}</td>
                  <td className="px-4 py-3 capitalize">{r.role ?? "—"}</td>
                  <td className="px-4 py-3">{r.position || "—"}</td>
                  <td className="px-4 py-3">
                    {r.confirmed
                      ? <span className="text-xs px-2 py-1 border border-border">Activo</span>
                      : <span className="text-xs px-2 py-1 border border-border text-muted-foreground">Pendiente</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => onDelete(r)} disabled={r.email.toLowerCase() === ADMIN_EMAIL}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Sin usuarios</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}
