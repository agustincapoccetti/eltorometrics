import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { checkPassword, PasswordRules } from "@/lib/password-validation";
import { POSITIONS, COACH_TYPES } from "@/lib/positions";

export const Route = createFileRoute("/registro")({ component: RegistroPage });


function RegistroPage() {
  const [role, setRole] = useState<"atleta" | "coach">("atleta");
  const [coachType, setCoachType] = useState<string>("preparador_fisico");
  const [form, setForm] = useState({
    email: "", password: "", full_name: "", position: "", weight: "", height: "",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!checkPassword(form.password).ok) { toast.error("La contraseña no cumple los requisitos de seguridad"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: form.full_name,
          role,
          coach_type: role === "coach" ? coachType : null,
          position: role === "atleta" ? form.position : null,
          weight: role === "atleta" ? form.weight : null,
          height: role === "atleta" ? form.height : null,
        },
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(role === "coach" ? "Cuenta creada. Pendiente de validación del administrador." : "Cuenta creada");
    navigate({ to: role === "coach" ? "/coach" : "/atleta" });
  }


  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-background">
      <div className="w-full max-w-md">
        <Link to="/" className="block mb-8 text-center">
          <Logo size={64} withText={false} />
          <p className="font-display text-sm tracking-wider mt-2">EL TORO RUGBY · CALVIÀ</p>
        </Link>
        <h1 className="text-3xl mb-6">Registro</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="mb-2 block">Tipo de cuenta</Label>
            <RadioGroup value={role} onValueChange={(v) => setRole(v as "atleta" | "coach")} className="grid grid-cols-2 gap-2">
              <label className={`border p-3 cursor-pointer flex items-center gap-2 ${role === "atleta" ? "bg-primary text-primary-foreground border-primary" : ""}`}>
                <RadioGroupItem value="atleta" className="sr-only" />
                <span className="font-display text-xs">ATLETA</span>
              </label>
              <label className={`border p-3 cursor-pointer flex items-center gap-2 ${role === "coach" ? "bg-primary text-primary-foreground border-primary" : ""}`}>
                <RadioGroupItem value="coach" className="sr-only" />
                <span className="font-display text-xs">CUERPO TÉCNICO</span>
              </label>
            </RadioGroup>
            {role === "coach" && (
              <>
                <div className="mt-3">
                  <Label>Categoría</Label>
                  <Select value={coachType} onValueChange={setCoachType}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                    <SelectContent>
                      {COACH_TYPES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Tu cuenta quedará pendiente hasta que el administrador valide tu ingreso.
                </p>
              </>
            )}
          </div>

          <div>
            <Label htmlFor="full_name">Nombre completo</Label>
            <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            <PasswordRules pw={form.password} />
          </div>

          {role === "atleta" && (
            <>
              <div>
                <Label>Posición</Label>
                <Select value={form.position} onValueChange={(v) => setForm({ ...form, position: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar posición" /></SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="weight">Peso (kg)</Label>
                  <Input id="weight" type="number" step="0.1" min="30" max="200" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} required />
                </div>
                <div>
                  <Label htmlFor="height">Altura (cm)</Label>
                  <Input id="height" type="number" step="0.1" min="120" max="230" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} required />
                </div>
              </div>
            </>
          )}

          <Button type="submit" disabled={loading} className="w-full">{loading ? "..." : "Crear cuenta"}</Button>
        </form>

        <p className="mt-6 text-sm text-center text-muted-foreground">
          ¿Ya tienes cuenta? <Link to="/login" className="text-foreground underline">Entrar</Link>
        </p>

      </div>
    </div>
  );
}
