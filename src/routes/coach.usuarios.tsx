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
import { POSITIONS, COACH_TYPES, coachTypeLabel } from "@/lib/positions";
import { toast } from "sonner";
import { Trash2, UserPlus, Mail, ShieldCheck, User } from "lucide-react";
import { RugbyLoader } from "@/components/RugbyLoader";
import { listUsers, inviteAthlete, deleteUser, setUserRole } from "@/lib/user-admin.functions";
import { useSort, sortIndicator } from "@/lib/sort";

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

type SortKey = "name" | "email" | "role" | "position" | "state";

function Page() {
  const { user } = useAuth();
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;

  const list = useServerFn(listUsers);
  const invite = useServerFn(inviteAthlete);
  const del = useServerFn(deleteUser);
  const changeRole = useServerFn(setUserRole);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [position, setPosition] = useState("");
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [promote, setPromote] = useState<{ row: Row; coachType: string } | null>(null);

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

  const f = filter.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    const matchText = !f || r.email.toLowerCase().includes(f) || r.full_name.toLowerCase().includes(f);
    const matchRole = roleFilter === "all" || (r.role ?? "sin") === roleFilter;
    return matchText && matchRole;
  });

  const { sorted, sort, toggle } = useSort<Row, SortKey>(
    filtered,
    {
      name: (r) => r.full_name || r.email,
      email: (r) => r.email,
      role: (r) => r.role ?? "",
      position: (r) => r.position,
      state: (r) => (r.confirmed ? 1 : 0),
    },
    { key: "name", dir: "asc" },
  );

  if (!isAdmin) {
    return (
      <Shell title="Usuarios">
        <p className="text-sm text-muted-foreground">Solo el administrador puede gestionar usuarios.</p>
      </Shell>
    );
  }

  async function onInvite() {
    if (!email.trim()) { toast.error("Ingresa un email"); return; }
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

  async function applyPromote() {
    if (!promote) return;
    setBusyId(promote.row.id);
    try {
      await changeRole({ data: { userId: promote.row.id, role: "coach", coachType: promote.coachType } });
      toast.success(`${promote.row.full_name || promote.row.email} ahora es cuerpo técnico (${coachTypeLabel(promote.coachType)})`);
      setPromote(null);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo cambiar el rol");
    } finally {
      setBusyId(null);
    }
  }

  async function toAthlete(row: Row) {
    if (!confirm(`¿Pasar a ${row.full_name || row.email} a la categoría atleta?`)) return;
    setBusyId(row.id);
    try {
      await changeRole({ data: { userId: row.id, role: "atleta" } });
      toast.success("Movido a atletas");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo cambiar el rol");
    } finally {
      setBusyId(null);
    }
  }

  const SortBtn = ({ k, children, className = "" }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <button onClick={() => toggle(k)} className={`flex items-center gap-1 uppercase tracking-wider ${className}`}>
      {children}<span className="opacity-50 text-[9px]">{sortIndicator(sort.key === k, sort.dir)}</span>
    </button>
  );

  return (
    <Shell title="Gestión de usuarios">
      <p className="text-sm text-muted-foreground mb-5">
        Añade atletas por email, cambia su categoría (atleta ⇄ cuerpo técnico) o elimina usuarios.
      </p>

      <div className="border border-border p-4 sm:p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="h-4 w-4" />
          <h2 className="text-sm uppercase tracking-wider font-semibold">Invitar atleta</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_160px_auto] gap-3 md:items-end">
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
          <Button onClick={onInvite} disabled={sending} className="w-full md:w-auto">
            <Mail className="h-4 w-4 mr-2" />
            {sending ? "Enviando..." : "Invitar"}
          </Button>
        </div>
      </div>

      <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-sm uppercase tracking-wider font-semibold">Usuarios registrados ({rows.length})</h2>
        <div className="flex gap-2">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-9 w-[150px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los roles</SelectItem>
              <SelectItem value="atleta">Atletas</SelectItem>
              <SelectItem value="coach">Cuerpo técnico</SelectItem>
              <SelectItem value="sin">Sin rol / pendiente</SelectItem>
            </SelectContent>
          </Select>
          <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Buscar nombre o email" className="flex-1 sm:max-w-xs" />
        </div>
      </div>

      {promote && (
        <div className="border-2 border-foreground p-4 mb-4">
          <p className="text-sm font-medium mb-2">
            Mover a <strong>{promote.row.full_name || promote.row.email}</strong> a cuerpo técnico
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="flex-1">
              <Label>Tipo de coach</Label>
              <Select value={promote.coachType} onValueChange={(v) => setPromote({ ...promote, coachType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COACH_TYPES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={applyPromote} disabled={busyId === promote.row.id}>Confirmar</Button>
            <Button variant="outline" onClick={() => setPromote(null)}>Cancelar</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-12 flex justify-center"><RugbyLoader /></div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="sm:hidden space-y-2">
            <div className="flex gap-3 text-[10px] text-muted-foreground px-1">
              <span>Ordenar:</span>
              <SortBtn k="name">Nombre</SortBtn>
              <SortBtn k="role">Rol</SortBtn>
              <SortBtn k="position">Puesto</SortBtn>
            </div>
            {sorted.map((r) => (
              <div key={r.id} className="border border-border p-3">
                <p className="text-sm font-medium">{r.full_name || "—"}</p>
                <p className="text-xs text-muted-foreground break-all">{r.email}</p>
                <div className="flex flex-wrap gap-2 mt-2 text-[10px] uppercase tracking-wider">
                  <span className="px-2 py-0.5 border border-border">{r.role === "coach" ? "Cuerpo técnico" : r.role ?? "sin rol"}</span>
                  {r.position && <span className="px-2 py-0.5 border border-border">{r.position}</span>}
                  <span className={`px-2 py-0.5 border border-border ${r.confirmed ? "" : "text-muted-foreground"}`}>{r.confirmed ? "Activo" : "Pendiente"}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  {r.role === "coach" ? (
                    <Button variant="outline" size="sm" className="flex-1" disabled={busyId === r.id || r.email.toLowerCase() === ADMIN_EMAIL} onClick={() => toAthlete(r)}>
                      <User className="h-3.5 w-3.5 mr-1" />A atleta
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="flex-1" disabled={busyId === r.id} onClick={() => setPromote({ row: r, coachType: "preparador_fisico" })}>
                      <ShieldCheck className="h-3.5 w-3.5 mr-1" />A cuerpo técnico
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => onDelete(r)} disabled={r.email.toLowerCase() === ADMIN_EMAIL}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {sorted.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Sin usuarios</p>}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3"><SortBtn k="name">Nombre</SortBtn></th>
                  <th className="text-left px-4 py-3"><SortBtn k="email">Email</SortBtn></th>
                  <th className="text-left px-4 py-3"><SortBtn k="role">Rol</SortBtn></th>
                  <th className="text-left px-4 py-3"><SortBtn k="position">Puesto</SortBtn></th>
                  <th className="text-left px-4 py-3"><SortBtn k="state">Estado</SortBtn></th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-3">{r.full_name || <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-3">{r.email}</td>
                    <td className="px-4 py-3">{r.role === "coach" ? "Cuerpo técnico" : r.role ?? "—"}</td>
                    <td className="px-4 py-3">{r.position || "—"}</td>
                    <td className="px-4 py-3">
                      {r.confirmed
                        ? <span className="text-xs px-2 py-1 border border-border">Activo</span>
                        : <span className="text-xs px-2 py-1 border border-border text-muted-foreground">Pendiente</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {r.role === "coach" ? (
                          <Button variant="outline" size="sm" disabled={busyId === r.id || r.email.toLowerCase() === ADMIN_EMAIL} onClick={() => toAthlete(r)}>
                            <User className="h-3.5 w-3.5 mr-1" />A atleta
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" disabled={busyId === r.id} onClick={() => setPromote({ row: r, coachType: "preparador_fisico" })}>
                            <ShieldCheck className="h-3.5 w-3.5 mr-1" />A cuerpo técnico
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => onDelete(r)} disabled={r.email.toLowerCase() === ADMIN_EMAIL}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sorted.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Sin usuarios</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Shell>
  );
}
