import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/login")({ component: LoginPage });

const KEEP_KEY = "etr_keep_logged_in";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keep, setKeep] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshRole } = useAuth();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const v = localStorage.getItem(KEEP_KEY);
      if (v === "false") setKeep(false);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { toast.error(error.message); setLoading(false); return; }
    localStorage.setItem(KEEP_KEY, keep ? "true" : "false");
    await refreshRole();
    const { data: roleData } = await supabase.from("user_roles").select("role").maybeSingle();
    toast.success("Bienvenido");
    if (roleData?.role === "coach") navigate({ to: "/coach" });
    else navigate({ to: "/atleta" });
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">
        <Link to="/" className="block mb-8 text-center">
          <Logo size={80} withText={false} />
          <p className="font-display text-sm tracking-wider mt-2">EL TORO RUGBY · CALVIÀ</p>
        </Link>
        <h1 className="text-3xl mb-6">Iniciar sesión</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="pw">Contraseña</Label>
            <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <Checkbox checked={keep} onCheckedChange={(v) => setKeep(v === true)} />
            <span>Mantener sesión iniciada en este dispositivo</span>
          </label>
          <Button type="submit" disabled={loading} className="w-full">{loading ? "..." : "Entrar"}</Button>
        </form>
        <p className="mt-6 text-sm text-center text-muted-foreground">
          ¿No tenés cuenta? <Link to="/registro" className="text-foreground underline">Registrate</Link>
        </p>
      </div>
    </div>
  );
}

