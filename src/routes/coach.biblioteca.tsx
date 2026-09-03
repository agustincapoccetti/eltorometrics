import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { SubTabs, ADMIN_TABS } from "@/components/SubTabs";
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
import {
  Plus,
  Trash2,
  Pencil,
  ExternalLink,
  PlayCircle,
  Search,
  FolderPlus,
} from "lucide-react";
import { toast } from "sonner";
import { FolderChips, type LibraryFolder } from "@/components/LibraryFolders";
import {
  LIBRARY_CATEGORIES,
  categoryLabel,
  categoryIcon,
  getThumbnail,
  deriveThumbnail,
  getEmbedUrl,
  openResource,
  isFileResource,
  fileIcon,
  fileNameOf,
  filePathOf,
  LIBRARY_BUCKET,
  FILE_URL_PREFIX,
} from "@/lib/library";

type LibraryItem = {
  id: string;
  title: string;
  description: string | null;
  url: string;
  category: string;
  thumbnail_url?: string | null;
  folder_id?: string | null;
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
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [folderFilter, setFolderFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "az" | "za">("recent");
  const [preview, setPreview] = useState<LibraryItem | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LibraryItem | null>(null);
  const [mode, setMode] = useState<"link" | "file">("link");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    url: "",
    category: "gym",
    thumbnail_url: "",
    folder_id: "none",
  });

  // Carpetas
  const [folderOpen, setFolderOpen] = useState(false);
  const [folderEditing, setFolderEditing] = useState<LibraryFolder | null>(null);
  const [folderForm, setFolderForm] = useState({ name: "", category: "gym" });

  async function load() {
    const [{ data: its }, { data: fs }] = await Promise.all([
      supabase.from("library_items").select("*").order("created_at", { ascending: false }),
      supabase.from("library_folders").select("id,name,category").order("name"),
    ]);
    setItems(its ?? []);
    setFolders(fs ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setEditing(null);
    setMode("link");
    setFile(null);
    setForm({
      title: "",
      description: "",
      url: "",
      category: filter === "all" ? "gym" : filter,
      thumbnail_url: "",
      folder_id: folderFilter !== "all" && folderFilter !== "none" ? folderFilter : "none",
    });
    setOpen(true);
  }
  function openEdit(it: LibraryItem) {
    setEditing(it);
    setMode(isFileResource(it.url) ? "file" : "link");
    setFile(null);
    setForm({
      title: it.title,
      description: it.description ?? "",
      url: it.url,
      category: it.category,
      thumbnail_url: it.thumbnail_url ?? "",
      folder_id: it.folder_id ?? "none",
    });
    setOpen(true);
  }

  async function uploadFile(f: File) {
    const safe = f.name.replace(/[^\w.\-]+/g, "_");
    const path = `${user!.id}/${Date.now()}-${safe}`;
    const { error } = await supabase.storage
      .from(LIBRARY_BUCKET)
      .upload(path, f, { contentType: f.type || undefined, upsert: false });
    if (error) throw new Error(error.message);
    return `${FILE_URL_PREFIX}${path}`;
  }

  async function save() {
    if (!form.title) {
      toast.error("El título es obligatorio");
      return;
    }
    setSaving(true);
    try {
      let url = form.url;
      if (mode === "file") {
        if (file) url = await uploadFile(file);
        else if (!isFileResource(url)) {
          toast.error("Selecciona un archivo");
          return;
        }
      } else if (!url || isFileResource(url)) {
        toast.error("Ingresa un enlace válido");
        return;
      }

      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        url,
        folder_id: form.folder_id === "none" ? null : form.folder_id,
        thumbnail_url: mode === "file" ? form.thumbnail_url || null : form.thumbnail_url,
      };
      const { error } = editing
        ? await supabase.from("library_items").update(payload).eq("id", editing.id)
        : await supabase.from("library_items").insert({ ...payload, created_by: user!.id });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Guardado");
      setOpen(false);
      setFile(null);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }
  async function remove(id: string) {
    if (!confirm("¿Eliminar este recurso?")) return;
    const item = items.find((i) => i.id === id);
    await supabase.from("library_items").delete().eq("id", id);
    const path = item ? filePathOf(item.url) : null;
    if (path) await supabase.storage.from(LIBRARY_BUCKET).remove([path]);
    load();
  }

  /* ---------- Carpetas ---------- */
  function openNewFolder() {
    setFolderEditing(null);
    setFolderForm({ name: "", category: filter === "all" ? "gym" : filter });
    setFolderOpen(true);
  }
  function openEditFolder(f: LibraryFolder) {
    setFolderEditing(f);
    setFolderForm({ name: f.name, category: f.category });
    setFolderOpen(true);
  }
  async function saveFolder() {
    const name = folderForm.name.trim();
    if (!name) {
      toast.error("Ponle un nombre a la carpeta");
      return;
    }
    const { error } = folderEditing
      ? await supabase
          .from("library_folders")
          .update({ name, category: folderForm.category })
          .eq("id", folderEditing.id)
      : await supabase
          .from("library_folders")
          .insert({ name, category: folderForm.category, created_by: user!.id });
    if (error) {
      toast.error(
        error.code === "23505" || error.message.includes("duplicate")
          ? "Ya existe una carpeta con ese nombre en esa categoría"
          : error.message,
      );
      return;
    }
    toast.success(folderEditing ? "Carpeta actualizada" : "Carpeta creada");
    setFolderOpen(false);
    load();
  }
  async function removeFolder(f: LibraryFolder) {
    if (!confirm(`¿Eliminar la carpeta "${f.name}"? Los recursos quedarán sin carpeta.`)) return;
    const { error } = await supabase.from("library_folders").delete().eq("id", f.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (folderFilter === f.id) setFolderFilter("all");
    load();
  }

  const visibleFolders = folders.filter((f) => filter === "all" || f.category === filter);
  const activeFolder = folders.find((f) => f.id === folderFilter) ?? null;

  const term = q.trim().toLowerCase();
  const byCategory = items.filter((i) => (filter === "all" ? true : i.category === filter));
  const folderCounts: Record<string, number> = {
    all: byCategory.length,
    none: byCategory.filter((i) => !i.folder_id).length,
  };
  for (const f of visibleFolders)
    folderCounts[f.id] = byCategory.filter((i) => i.folder_id === f.id).length;

  const filtered = byCategory
    .filter((i) =>
      folderFilter === "all"
        ? true
        : folderFilter === "none"
          ? !i.folder_id
          : i.folder_id === folderFilter,
    )
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
      <SubTabs tabs={ADMIN_TABS} />
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          Comparte videos y enlaces para que los atletas consulten.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openNewFolder}>
            <FolderPlus className="h-4 w-4 mr-2" />
            Nueva carpeta
          </Button>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo recurso
          </Button>
        </div>
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

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground mr-1">
          Categoría:
        </span>
        {[{ v: "all", l: "Todas", icon: "📚" }, ...LIBRARY_CATEGORIES].map((c) => (
          <button
            key={c.v}
            type="button"
            onClick={() => {
              setFilter(c.v);
              setFolderFilter("all");
            }}
            className={`px-3 py-1.5 text-xs uppercase tracking-wider border ${filter === c.v ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}
          >
            <span className="mr-1">{c.icon}</span>
            {c.l}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <FolderChips
          folders={visibleFolders}
          value={folderFilter}
          onChange={setFolderFilter}
          counts={folderCounts}
        />
        {activeFolder && (
          <div className="flex gap-1 mb-6">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Renombrar carpeta"
              onClick={() => openEditFolder(activeFolder)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Eliminar carpeta"
              onClick={() => removeFolder(activeFolder)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay recursos en esta carpeta.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {filtered.map((it) => {
            const thumb = getThumbnail(it);
            const embed = getEmbedUrl(it.url);
            const folderName = folders.find((f) => f.id === it.folder_id)?.name;
            return (
              <div key={it.id} className="border border-border flex flex-col overflow-hidden">
                {thumb ? (
                  <button
                    type="button"
                    onClick={() => (embed ? setPreview(it) : openResource(it))}
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
                    onClick={() => (embed ? setPreview(it) : openResource(it))}
                    className="aspect-video bg-muted flex flex-col items-center justify-center gap-1 text-2xl"
                  >
                    {isFileResource(it.url) ? fileIcon(it.url) : categoryIcon(it.category)}
                    {isFileResource(it.url) && (
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 truncate max-w-full">
                        {fileNameOf(it.url)}
                      </span>
                    )}
                  </button>
                )}
                <div className="p-3 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {categoryIcon(it.category)} {categoryLabel(it.category)}
                      {folderName && ` · 📁 ${folderName}`}
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
                    onClick={() => (embed ? setPreview(it) : openResource(it))}
                    className="text-xs text-primary mt-2 inline-flex items-center gap-1 hover:underline text-left"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {isFileResource(it.url) ? "Abrir archivo" : "Abrir"}
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
                onValueChange={(v) => setForm({ ...form, category: v, folder_id: "none" })}
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
              <Label>Carpeta</Label>
              <Select
                value={form.folder_id}
                onValueChange={(v) => setForm({ ...form, folder_id: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin carpeta</SelectItem>
                  {folders
                    .filter((f) => f.category === form.category)
                    .map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        📁 {f.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de recurso</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {(
                  [
                    { v: "link", l: "🔗 Enlace / video" },
                    { v: "file", l: "📄 Archivo / PDF" },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => setMode(o.v)}
                    className={`px-3 py-2 text-xs uppercase tracking-wider border ${mode === o.v ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            {mode === "link" ? (
              <div>
                <Label>Enlace (video o web)</Label>
                <Input
                  value={isFileResource(form.url) ? "" : form.url}
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
            ) : (
              <div>
                <Label>Archivo (PDF, Word, Excel, imagen…)</Label>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,image/*,video/*"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="text-xs"
                />
                {file ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                ) : isFileResource(form.url) ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    Actual: {fileIcon(form.url)} {fileNameOf(form.url)} — elige otro archivo para
                    reemplazarlo.
                  </p>
                ) : null}
              </div>
            )}

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
            <Button onClick={save} disabled={saving}>
              {saving ? "Guardando…" : editing ? "Actualizar" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={folderOpen} onOpenChange={setFolderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{folderEditing ? "Editar carpeta" : "Nueva carpeta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nombre</Label>
              <Input
                value={folderForm.name}
                onChange={(e) => setFolderForm({ ...folderForm, name: e.target.value })}
                placeholder="Ej. Tren inferior, Scrum, Movilidad…"
              />
            </div>
            <div>
              <Label>Categoría</Label>
              <Select
                value={folderForm.category}
                onValueChange={(v) => setFolderForm({ ...folderForm, category: v })}
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveFolder}>{folderEditing ? "Actualizar" : "Crear"}</Button>
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
