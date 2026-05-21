import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshRole } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { toast.error(error.message); setLoading(false); return; }
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
          <Button type="submit" disabled={loading} className="w-full">{loading ? "..." : "Entrar"}</Button>
        </form>
        <p className="mt-6 text-sm text-center text-muted-foreground">
          ¿No tenés cuenta? <Link to="/registro" className="text-foreground underline">Registrate</Link>
        </p>
      </div>
    </div>
  );
}
