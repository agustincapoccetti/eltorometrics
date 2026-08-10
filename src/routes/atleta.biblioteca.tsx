import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { Protected } from "@/lib/protected";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalLink, PlayCircle } from "lucide-react";
import {
  LIBRARY_CATEGORIES,
  categoryLabel,
  categoryIcon,
  getThumbnail,
  getEmbedUrl,
} from "@/lib/library";

type LibraryItem = {
  id: string;
  title: string;
  description: string | null;
  url: string;
  category: string;
  thumbnail_url?: string | null;
};

export const Route = createFileRoute("/atleta/biblioteca")({
  component: () => (
    <Protected requireRole="atleta">
      <AthleteLibrary />
    </Protected>
  ),
});

function AthleteLibrary() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "az" | "za">("recent");
  const [preview, setPreview] = useState<LibraryItem | null>(null);

  useEffect(() => {
    supabase
      .from("library_items")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setItems(data ?? []));
  }, []);

  const term = q.trim().toLowerCase();
  const filtered = items
    .filter((i) => (filter === "all" ? true : i.category === filter))
    .filter((i) =>
      !term
        ? true
        : `${i.title} ${i.description ?? ""}`.toLowerCase().includes(term),
    )
    .sort((a, b) => {
      if (sortBy === "recent") return 0;
      const cmp = a.title.localeCompare(b.title, "es", { sensitivity: "base" });
      return sortBy === "az" ? cmp : -cmp;
    });

  return (
    <Shell title="Biblioteca">
      <p className="text-sm text-muted-foreground mb-4">
        Recursos compartidos por el cuerpo técnico.
      </p>

      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar ejercicio o palabra clave…"
            className="h-9 pl-7 text-xs"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
          <SelectTrigger className="h-9 w-full sm:w-[190px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Más recientes</SelectItem>
            <SelectItem value="az">Nombre A → Z</SelectItem>
            <SelectItem value="za">Nombre Z → A</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground mr-1">
          Categoría:
        </span>
        {[{ v: "all", l: "Todas", icon: "📚" }, ...LIBRARY_CATEGORIES].map((c) => (
          <button
            key={c.v}
            type="button"
            onClick={() => setFilter(c.v)}
            className={`px-3 py-1.5 text-xs uppercase tracking-wider border ${filter === c.v ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}
          >
            <span className="mr-1">{c.icon}</span>
            {c.l}
          </button>
        ))}
      </div>


      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay recursos disponibles.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {filtered.map((it) => {
            const thumb = getThumbnail(it);
            const embed = getEmbedUrl(it.url);
            return (
              <div
                key={it.id}
                className="border border-border hover:bg-accent flex flex-col overflow-hidden group"
              >
                {thumb ? (
                  <button
                    type="button"
                    onClick={() =>
                      embed ? setPreview(it) : window.open(it.url, "_blank", "noopener,noreferrer")
                    }
                    className="relative aspect-video bg-muted overflow-hidden text-left"
                  >
                    <img
                      src={thumb}
                      alt={it.title}
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <PlayCircle className="absolute inset-0 m-auto h-8 w-8 text-background drop-shadow group-hover:scale-110 transition" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      embed ? setPreview(it) : window.open(it.url, "_blank", "noopener,noreferrer")
                    }
                    className="aspect-video bg-muted flex items-center justify-center text-2xl"
                  >
                    {categoryIcon(it.category)}
                  </button>
                )}
                <div className="p-3">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {categoryIcon(it.category)} {categoryLabel(it.category)}
                  </span>
                  <p className="text-xs font-medium mt-1 leading-snug">{it.title}</p>
                  {it.description && (
                    <p className="text-xs text-muted-foreground mt-1">{it.description}</p>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      embed ? setPreview(it) : window.open(it.url, "_blank", "noopener,noreferrer")
                    }
                    className="text-xs text-primary mt-2 inline-flex items-center gap-1 hover:underline text-left"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Abrir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>{preview?.title}</DialogTitle>
          </DialogHeader>
          {preview && getEmbedUrl(preview.url) && (
            <iframe
              src={getEmbedUrl(preview.url)!}
              title={preview.title}
              className="w-full aspect-video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
