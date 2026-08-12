import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { Protected } from "@/lib/protected";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useSort, sortIndicator } from "@/lib/sort";

export const Route = createFileRoute("/coach/jugadores")({
  component: () => <Protected requireRole="coach"><CoachPlayers /></Protected>,
});

function isoDate(d: Date) { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const dd = String(d.getDate()).padStart(2, "0"); return `${y}-${m}-${dd}`; }
function startOfWeek(d = new Date()) { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0,0,0,0); return x; }
function startOfMonth(d = new Date()) { const x = new Date(d); x.setDate(1); x.setHours(0,0,0,0); return x; }
function startOfYear(d = new Date()) { const x = new Date(d.getFullYear(), 0, 1); return x; }

function lastNameOf(p: any) {
  return (p.last_name?.trim() || p.full_name?.split(" ").slice(-1)[0] || "").toLowerCase();
}

function CoachPlayers() {
  const { user } = useAuth();
  const [athletes, setAthletes] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(isoDate(new Date()));
  const [positionFilter, setPositionFilter] = useState("all");
  const [q, setQ] = useState("");
  const [matchMinutes, setMatchMinutes] = useState<Record<string, number>>({});

  async function load() {
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "atleta");
    const ids = (roles ?? []).map((r) => r.user_id);
    if (!ids.length) { setAthletes([]); return; }
    const { data: profs } = await supabase.from("profiles").select("id, full_name, last_name, position, photo_url").in("id", ids);
    setAthletes((profs ?? []).sort((a, b) => lastNameOf(a).localeCompare(lastNameOf(b))));

    const yearStart = isoDate(startOfYear());
    const { data: atts } = await supabase.from("attendance").select("*").gte("attendance_date", yearStart);
    setAttendance(atts ?? []);

    const { data: mps } = await supabase.from("match_participations").select("user_id, minutes_played");
    const m: Record<string, number> = {};
    (mps ?? []).forEach((p: any) => { m[p.user_id] = (m[p.user_id] ?? 0) + (p.minutes_played ?? 0); });
    setMatchMinutes(m);
  }
  useEffect(() => { load(); }, []);

  const positions = useMemo(() => Array.from(new Set(athletes.map((a) => a.position?.trim() || "Sin puesto"))).sort(), [athletes]);
  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return athletes
      .filter((a) => positionFilter === "all" || (a.position?.trim() || "Sin puesto") === positionFilter)
      .filter((a) =>
        !term ? true : `${a.last_name ?? ""} ${a.full_name ?? ""}`.toLowerCase().includes(term),
      );
  }, [athletes, positionFilter, q]);



  const wStart = isoDate(startOfWeek());
  const mStart = isoDate(startOfMonth());
  const yStart = isoDate(startOfYear());

  const stats = useMemo(() => {
    const map: Record<string, { week: number; month: number; year: number; today: boolean; autoToday: boolean }> = {};
    attendance.forEach((a) => {
      const e = (map[a.user_id] ??= { week: 0, month: 0, year: 0, today: false, autoToday: false });
      if (a.attendance_date === selectedDate) {
        e.today = !!a.present;
        e.autoToday = a.source === "rpe" && !!a.present;
      }
      if (!a.present) return;
      if (a.attendance_date >= yStart) e.year++;
      if (a.attendance_date >= mStart) e.month++;
      if (a.attendance_date >= wStart) e.week++;
    });
    return map;
  }, [attendance, selectedDate, wStart, mStart, yStart]);

  const { sorted, sort, toggle } = useSort<any, "name" | "position" | "week" | "month" | "year" | "minutes">(
    visible,
    {
      name: (p: any) => lastNameOf(p),
      position: (p: any) => p.position?.trim() || "",
      week: (p: any) => stats[p.id]?.week ?? 0,
      month: (p: any) => stats[p.id]?.month ?? 0,
      year: (p: any) => stats[p.id]?.year ?? 0,
      minutes: (p: any) => matchMinutes[p.id] ?? 0,
    },
    { key: "name", dir: "asc" },
  );

  const SortBtn = ({ k, children, className = "" }: { k: any; children: React.ReactNode; className?: string }) => (
    <button onClick={() => toggle(k)} className={`inline-flex items-center gap-1 ${className}`}>
      {children}<span className="opacity-50 text-[9px]">{sortIndicator(sort.key === k, sort.dir)}</span>
    </button>
  );


  async function togglePresent(uid: string, present: boolean) {
    const existing = attendance.find((a) => a.user_id === uid && a.attendance_date === selectedDate);
    if (existing) {
      const { error } = await supabase.from("attendance").update({ present }).eq("id", existing.id);
      if (error) { toast.error(error.message); return; }
      setAttendance((cur) => cur.map((a) => a.id === existing.id ? { ...a, present } : a));
    } else {
      const { data, error } = await supabase.from("attendance").insert({ user_id: uid, attendance_date: selectedDate, present, created_by: user!.id }).select().single();
      if (error) { toast.error(error.message); return; }
      setAttendance((cur) => [...cur, data]);
    }
  }

  function shiftDate(days: number) {
    const d = new Date(selectedDate + "T12:00");
    d.setDate(d.getDate() + days);
    setSelectedDate(isoDate(d));
  }

  return (
    <Shell title="Lista de jugadores">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
        <Select value={positionFilter} onValueChange={setPositionFilter}>
          <SelectTrigger className="h-9 w-full sm:w-[160px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los puestos</SelectItem>
            {positions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative w-full sm:w-[220px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o apellido…"
            className="h-9 pl-7 text-xs"
          />
        </div>
        <div className="sm:ml-auto flex items-center gap-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground mr-1 hidden sm:inline">Presentismo del día</span>
          <Button size="sm" variant="outline" onClick={() => shiftDate(-1)}><ChevronLeft className="h-3 w-3" /></Button>
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="h-9 flex-1 sm:w-[150px] text-xs" />
          <Button size="sm" variant="outline" onClick={() => shiftDate(1)}><ChevronRight className="h-3 w-3" /></Button>
        </div>
      </div>

      {/* Mobile: compact cards with sort controls */}
      <div className="sm:hidden">
        <div className="flex flex-wrap gap-2 items-center text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
          <span>Ordenar:</span>
          <SortBtn k="name">Apellido</SortBtn>
          <SortBtn k="position">Puesto</SortBtn>
          <SortBtn k="week">Semana</SortBtn>
          <SortBtn k="year">Año</SortBtn>
          <SortBtn k="minutes">Minutos</SortBtn>
        </div>
        <div className="border border-border">
          {sorted.length === 0 && <p className="p-6 text-sm text-muted-foreground">Sin jugadores.</p>}
          {sorted.map((p: any) => {
            const s = stats[p.id] ?? { week: 0, month: 0, year: 0, today: false, autoToday: false };
            return (
              <div key={p.id} className="flex gap-3 items-center px-3 py-2.5 border-b border-border last:border-0">
                <div className="w-9 h-9 shrink-0 border border-border bg-secondary overflow-hidden">
                  {p.photo_url && <img src={p.photo_url} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <Link to="/coach/atleta/$id" params={{ id: p.id }} className="text-sm font-medium hover:underline block truncate">
                    {(p.last_name ? p.last_name + ", " : "") + p.full_name}
                  </Link>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                    {p.position ?? "—"} · Sem {s.week} · Mes {s.month} · Año {s.year} · {matchMinutes[p.id] ?? 0}'
                  </p>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <Checkbox checked={s.today} disabled={s.autoToday} onCheckedChange={(v) => togglePresent(p.id, !!v)} className="h-5 w-5 data-[disabled]:opacity-100 data-[disabled]:bg-muted" />
                  {s.autoToday && <span className="text-[8px] uppercase tracking-wider text-muted-foreground">RPE</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block border border-border bg-background overflow-x-auto">
        <div className="grid grid-cols-[36px_1.6fr_0.7fr_0.6fr_0.6fr_0.6fr_0.7fr_60px] gap-2 px-3 py-2 border-b border-border bg-secondary text-[10px] uppercase tracking-wider font-medium min-w-[720px]">
          <div></div>
          <div><SortBtn k="name">Jugador</SortBtn></div>
          <div><SortBtn k="position">Puesto</SortBtn></div>
          <div className="text-center"><SortBtn k="week">Sem.</SortBtn></div>
          <div className="text-center"><SortBtn k="month">Mes</SortBtn></div>
          <div className="text-center"><SortBtn k="year">Año</SortBtn></div>
          <div className="text-center"><SortBtn k="minutes">Min. part.</SortBtn></div>
          <div className="text-center">Hoy</div>
        </div>
        {sorted.length === 0 && <p className="p-6 text-sm text-muted-foreground">Sin jugadores.</p>}
        {sorted.map((p: any) => {
          const s = stats[p.id] ?? { week: 0, month: 0, year: 0, today: false, autoToday: false };
          return (
            <div key={p.id} className="grid grid-cols-[36px_1.6fr_0.7fr_0.6fr_0.6fr_0.6fr_0.7fr_60px] gap-2 px-3 py-2 border-b border-border last:border-b-0 items-center text-xs min-w-[720px]">
              <div className="w-8 h-8 border border-border bg-secondary overflow-hidden">
                {p.photo_url && <img src={p.photo_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <Link to="/coach/atleta/$id" params={{ id: p.id }} className="font-medium hover:underline truncate">
                {(p.last_name ? p.last_name + ", " : "") + p.full_name}
              </Link>
              <div className="text-[10px] text-muted-foreground truncate">{p.position ?? "—"}</div>
              <div className="text-center font-medium">{s.week}</div>
              <div className="text-center font-medium">{s.month}</div>
              <div className="text-center font-medium">{s.year}</div>
              <div className="text-center">{matchMinutes[p.id] ?? 0}'</div>
              <div className="flex flex-col items-center justify-center gap-0.5">
                <Checkbox checked={s.today} disabled={s.autoToday} onCheckedChange={(v) => togglePresent(p.id, !!v)} className="data-[disabled]:opacity-100 data-[disabled]:bg-muted" />
                {s.autoToday && <span className="text-[8px] uppercase tracking-wider text-muted-foreground">RPE</span>}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground mt-3">El presentismo se marca con el checkbox de la columna "Hoy" para la fecha seleccionada. Si el jugador ya respondió el RPE de ese día, su presente se marca automáticamente y queda bloqueado (etiqueta "RPE"). Los conteos por semana, mes y año se actualizan al instante.</p>
    </Shell>
  );
}
