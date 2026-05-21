import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Camera } from "lucide-react";

export const Route = createFileRoute("/atleta/onboarding")({ component: Onboarding });

const POSITIONS = [
  "Pilar", "Hooker", "Segunda Línea", "Ala", "Octavo",
  "Medio Scrum", "Apertura", "Centro", "Wing", "Fullback",
];

function Onboarding() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "", last_name: "", age: "", position: "", weight: "", height: "",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (data?.onboarded) { navigate({ to: "/atleta" }); return; }
      if (data) {
        setForm({
          full_name: data.full_name ?? "",
          last_name: data.last_name ?? "",
          age: data.age?.toString() ?? "",
          position: data.position ?? "",
          weight: data.weight?.toString() ?? "",
          height: data.height?.toString() ?? "",
        });
        if (data.photo_url) setPhotoPreview(data.photo_url);
      }
      setLoadingProfile(false);
    })();
  }, [user, loading, navigate]);

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error("Foto muy grande (máx 5MB)"); return; }
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!form.full_name || !form.last_name || !form.age || !form.position || !form.weight || !form.height) {
      toast.error("Completá todos los campos"); return;
    }
    setSaving(true);
    let photo_url: string | undefined;
    if (photoFile) {
      const ext = photoFile.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from("athlete-photos").upload(path, photoFile, { upsert: true, cacheControl: "3600" });
      if (upErr) { toast.error(upErr.message); setSaving(false); return; }
      const { data: pub } = supabase.storage.from("athlete-photos").getPublicUrl(path);
      photo_url = `${pub.publicUrl}?t=${Date.now()}`;
    }
    const weight = parseFloat(form.weight);
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name,
      last_name: form.last_name,
      age: parseInt(form.age),
      position: form.position,
      weight,
      height: parseFloat(form.height),
      ...(photo_url ? { photo_url } : {}),
      last_weight_update: new Date().toISOString(),
      onboarded: true,
    }).eq("id", user.id);
    if (error) { toast.error(error.message); setSaving(false); return; }
    await supabase.from("weight_history").insert({ user_id: user.id, weight });
    toast.success("Perfil completado");
    navigate({ to: "/atleta" });
  }

  if (loading || loadingProfile) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <Logo size={64} withText={false} />
          <p className="font-display text-sm tracking-wider mt-2">EL TORO RUGBY · CALVIÀ</p>
        </div>
        <h1 className="text-3xl mb-2">Completá tu perfil</h1>
        <p className="text-sm text-muted-foreground mb-6">Estos datos son obligatorios antes de comenzar.</p>

        <form onSubmit={submit} className="space-y-5">
          <div className="flex flex-col items-center gap-3 p-6 border border-border">
            <label className="cursor-pointer block">
              <div className="w-28 h-28 border border-border bg-secondary overflow-hidden flex items-center justify-center">
                {photoPreview ? (
                  <img src={photoPreview} alt="Foto" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={onPhotoChange} />
            </label>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Foto de perfil</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="fn">Nombre</Label>
              <Input id="fn" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="ln">Apellido</Label>
              <Input id="ln" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="age">Edad</Label>
              <Input id="age" type="number" min={10} max={70} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="w">Peso (kg)</Label>
              <Input id="w" type="number" step="0.1" min={30} max={200} value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="h">Altura (cm)</Label>
              <Input id="h" type="number" step="0.1" min={120} max={230} value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} required />
            </div>
          </div>

          <div>
            <Label>Posición</Label>
            <Select value={form.position} onValueChange={(v) => setForm({ ...form, position: v })}>
              <SelectTrigger><SelectValue placeholder="Seleccioná tu puesto" /></SelectTrigger>
              <SelectContent>
                {POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={saving} className="w-full" size="lg">
            {saving ? "Guardando..." : "Guardar y continuar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
