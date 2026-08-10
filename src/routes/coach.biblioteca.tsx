import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { Protected } from "@/lib/protected";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Pencil, ExternalLink, PlayCircle, Search } from "lucide-react";
import { toast } from "sonner";
import {
  LIBRARY_CATEGORIES,
  categoryLabel,
  categoryIcon,
  getThumbnail,
  deriveThumbnail,
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

export const Route = createFileRoute("/coach/biblioteca")({
  component: () => (
    <Protected requireRole="coach">
      <CoachLibrary />
    </Protected>
  ),
});

function CoachLibrary() {
  const { user } = useAuth();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "az" | "za">("recent");
  const [preview, setPreview] = useState<LibraryItem | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LibraryItem | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    url: "",
    category: "gym",
    thumbnail_url: "",
  });

  async function load() {
    const { data } = await supabase
      .from("library_items")
      .select("*")
      .order("created_at", { ascending: false });
    setItems(data ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setEditing(null);
    setForm({ title: "", description: "", url: "", category: "gym", thumbnail_url: "" });
    setOpen(true);
  }
  function openEdit(it: LibraryItem) {
    setEditing(it);
    setForm({
      title: it.title,
      description: it.description ?? "",
      url: it.url,
      category: it.category,
      thumbnail_url: it.thumbnail_url ?? "",
    });
    setOpen(true);
  }
  async function save() {
    if (!form.title || !form.url) {
      toast.error("Título y enlace son obligatorios");
      return;
    }
    if (editing) {
      const { error } = await supabase.from("library_items").update(form).eq("id", editing.id);
      if (error) {
        toast.error(error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("library_items")
        .insert({ ...form, created_by: user!.id });
      if (error) {
        toast.error(error.message);
        return;
      }
    }
    toast.success("Guardado");
    setOpen(false);
    load();
  }
  async function remove(id: string) {
    if (!confirm("¿Eliminar este recurso?")) return;
    await supabase.from("library_items").delete().eq("id", id);
    load();
  }

  const term = q.trim().toLowerCase();
  const filtered = items
    .filter((i) => (filter === "all" ? true : i.category === filter))
    .filter((i) =>
      !term ? true : `${i.title} ${i.description ?? ""}`.toLowerCase().includes(term),
    )
    .sort((a, b) => {
      if (sortBy === "recent") return 0;
      const cmp = a.title.localeCompare(b.title, "es", { sensitivity: "base" });
      return sortBy === "az" ? cmp : -cmp;
    });

  return (
    <Shell title="Biblioteca">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          Comparte videos y enlaces para que los atletas consulten.
        </p>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo recurso
        </Button>
      </div>

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
        <p className="text-sm text-muted-foreground">No hay recursos en esta categoría.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {filtered.map((it) => {
            const thumb = getThumbnail(it);
            const embed = getEmbedUrl(it.url);
            return (
              <div key={it.id} className="border border-border flex flex-col overflow-hidden">
                {thumb ? (
                  <button
                    type="button"
                    onClick={() =>
                      embed ? setPreview(it) : window.open(it.url, "_blank", "noopener,noreferrer")
                    }
                    className="relative block aspect-video bg-muted overflow-hidden group text-left"
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
                <div className="p-3 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {categoryIcon(it.category)} {categoryLabel(it.category)}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(it)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => remove(it.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs font-medium leading-snug">{it.title}</p>
                  {it.description && (
                    <p className="text-xs text-muted-foreground mt-1 flex-1">{it.description}</p>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar recurso" : "Nuevo recurso"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Título</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Categoría</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LIBRARY_CATEGORIES.map((c) => (
                    <SelectItem key={c.v} value={c.v}>
                      {c.icon} {c.l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Enlace (video o web)</Label>
              <Input
                value={form.url}
                onChange={(e) =>
                  setForm({
                    ...form,
                    url: e.target.value,
                    thumbnail_url: form.thumbnail_url || deriveThumbnail(e.target.value) || "",
                  })
                }
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Miniatura (opcional)</Label>
              <Input
                value={form.thumbnail_url}
                onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
                placeholder="URL de imagen — se autodetecta para YouTube/Vimeo"
              />
              {(form.thumbnail_url || deriveThumbnail(form.url)) && (
                <img
                  src={form.thumbnail_url || deriveThumbnail(form.url)!}
                  alt=""
                  className="mt-2 w-32 aspect-video object-cover border border-border"
                />
              )}
            </div>
            <div>
              <Label>Descripción (opcional)</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save}>{editing ? "Actualizar" : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
