import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { Protected } from "@/lib/protected";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink } from "lucide-react";
import { LIBRARY_CATEGORIES, categoryLabel, categoryIcon } from "@/lib/library";

export const Route = createFileRoute("/atleta/biblioteca")({
  component: () => <Protected requireRole="atleta"><AthleteLibrary /></Protected>,
});

function AthleteLibrary() {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    supabase.from("library_items").select("*").order("created_at", { ascending: false }).then(({ data }) => setItems(data ?? []));
  }, []);

  const filtered = filter === "all" ? items : items.filter((i) => i.category === filter);

  return (
    <Shell title="Biblioteca">
      <p className="text-sm text-muted-foreground mb-4">Recursos compartidos por el cuerpo técnico.</p>

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground mr-1">Categoría:</span>
        {[{ v: "all", l: "Todas", icon: "📚" }, ...LIBRARY_CATEGORIES].map((c) => (
          <button key={c.v} type="button" onClick={() => setFilter(c.v)}
            className={`px-3 py-1.5 text-xs uppercase tracking-wider border ${filter === c.v ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}>
            <span className="mr-1">{c.icon}</span>{c.l}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay recursos disponibles.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map((it) => (
            <a key={it.id} href={it.url} target="_blank" rel="noopener noreferrer" className="border border-border p-4 hover:bg-accent">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{categoryIcon(it.category)} {categoryLabel(it.category)}</span>
              <p className="text-sm font-medium mt-1">{it.title}</p>
              {it.description && <p className="text-xs text-muted-foreground mt-1">{it.description}</p>}
              <span className="text-xs text-primary mt-2 inline-flex items-center gap-1"><ExternalLink className="h-3 w-3" />Abrir</span>
            </a>
          ))}
        </div>
      )}
    </Shell>
  );
}
