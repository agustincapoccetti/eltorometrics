import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { SubTabs, PLANTEL_TABS } from "@/components/SubTabs";
import { Protected } from "@/lib/protected";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Vote, ChevronDown } from "lucide-react";
import { fmtDate } from "@/lib/format-date";

export const Route = createFileRoute("/coach/votacion")({
  head: () => ({
    meta: [
      { title: "Votación semanal · Staff · El Toro Rugby Performance" },
      { name: "description", content: "Revisa quién votó a quién cada semana y lee los comentarios del plantel." },
      { property: "og:title", content: "Votación semanal · Staff" },
      { property: "og:description", content: "Revisa quién votó a quién cada semana y lee los comentarios del plantel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <Protected requireRole="coach">
      <CoachVotes />
    </Protected>
  ),
});

type VoteRow = {
  id: string;
  voter_id: string;
  nominee_id: string;
  week_start: string;
  comment: string;
  created_at: string;
};

type Profile = { id: string; full_name: string | null; last_name: string | null; position: string | null };

function nameOf(p?: Profile) {
  if (!p) return "Atleta";
  return `${p.full_name ?? ""}${p.last_name ? ` ${p.last_name}` : ""}`.trim() || "Atleta";
}

function CoachVotes() {
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [week, setWeek] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: v }, { data: p }] = await Promise.all([
        supabase.from("weekly_votes").select("*").order("week_start", { ascending: false }).order("created_at", { ascending: true }),
        supabase.from("profiles").select("id, full_name, last_name, position"),
      ]);
      const rows = (v ?? []) as VoteRow[];
      setVotes(rows);
      setProfiles(Object.fromEntries((p ?? []).map((x: any) => [x.id, x])));
      setWeek(rows[0]?.week_start ?? "");
      setLoading(false);
    })();
  }, []);

  const weeks = useMemo(() => Array.from(new Set(votes.map((v) => v.week_start))), [votes]);
  const rows = votes.filter((v) => v.week_start === week);

  const tally = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((v) => m.set(v.nominee_id, (m.get(v.nominee_id) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  return (
    <Shell title="Votación semanal">
      <SubTabs tabs={PLANTEL_TABS} />

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando votos…</p>
      ) : weeks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay votos registrados.</p>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-1">
            {weeks.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWeek(w)}
                className={`border border-black px-2 py-1 text-[11px] uppercase tracking-wider ${
                  week === w ? "bg-black text-white" : "hover:bg-accent"
                }`}
              >
                Semana del {fmtDate(w)}
              </button>
            ))}
          </div>

          <section className="border-2 border-black p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <Trophy className="h-3 w-3" /> Podio de la semana
            </p>
            <ul className="mt-2 divide-y divide-border">
              {tally.map(([id, count], i) => (
                <li key={id} className="flex items-center gap-3 py-1.5 text-sm">
                  <span className="w-6 font-display text-xs">{i + 1}º</span>
                  <span className="flex-1 min-w-0 truncate">
                    {nameOf(profiles[id])}
                    {profiles[id]?.position && (
                      <span className="ml-2 text-[10px] text-muted-foreground">{profiles[id]?.position}</span>
                    )}
                  </span>
                  <span className="font-display tabular-nums">{count}</span>
                  <span className="text-[10px] uppercase text-muted-foreground">
                    {count === 1 ? "voto" : "votos"}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="border border-border">
            <p className="border-b border-border px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <Vote className="h-3 w-3" /> {rows.length} {rows.length === 1 ? "voto" : "votos"} · quién votó a quién
            </p>
            <ul className="divide-y divide-border">
              {rows.map((v) => (
                <li key={v.id} className="px-3 py-3">
                  <p className="text-sm">
                    <span className="font-semibold">{nameOf(profiles[v.voter_id])}</span>
                    <span className="text-muted-foreground"> votó a </span>
                    <span className="font-semibold">{nameOf(profiles[v.nominee_id])}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">"{v.comment}"</p>
                </li>
              ))}
            </ul>
          </section>

          <NomineeBreakdown rows={rows} profiles={profiles} />
        </div>
      )}
    </Shell>
  );
}

function NomineeBreakdown({ rows, profiles }: { rows: VoteRow[]; profiles: Record<string, Profile> }) {
  const [open, setOpen] = useState<string | null>(null);
  const grouped = useMemo(() => {
    const m = new Map<string, VoteRow[]>();
    rows.forEach((v) => m.set(v.nominee_id, [...(m.get(v.nominee_id) ?? []), v]));
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [rows]);

  if (!grouped.length) return null;

  return (
    <section className="border border-border">
      <p className="border-b border-border px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        Comentarios por jugador votado
      </p>
      <div className="divide-y divide-border">
        {grouped.map(([id, list]) => {
          const isOpen = open === id;
          return (
            <div key={id}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : id)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left"
              >
                <span className="flex-1 min-w-0 truncate">{nameOf(profiles[id])}</span>
                <span className="font-display tabular-nums">{list.length}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <ul className="px-3 pb-3 space-y-2">
                  {list.map((v) => (
                    <li key={v.id} className="text-xs">
                      <span className="font-semibold">{nameOf(profiles[v.voter_id])}:</span>{" "}
                      <span className="text-muted-foreground">"{v.comment}"</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
