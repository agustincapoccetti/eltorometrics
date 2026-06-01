import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { checkPassword, PasswordRules } from "@/lib/password-validation";

export const Route = createFileRoute("/reset-password")({ component: ResetPage });

function ResetPage() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!checkPassword(pw).ok) { toast.error("La contraseña no cumple los requisitos"); return; }
    if (pw !== pw2) { toast.error("Las contraseñas no coinciden"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Contraseña actualizada");
    navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">
        <Link to="/" className="block mb-8 text-center">
          <Logo size={80} withText={false} />
        </Link>
        <h1 className="text-3xl mb-6">Nueva contraseña</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="pw">Contraseña</Label>
            <Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required />
            <PasswordRules pw={pw} />
          </div>
          <div>
            <Label htmlFor="pw2">Repetir contraseña</Label>
            <Input id="pw2" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
          </div>
          <Button type="submit" disabled={loading} className="w-full">{loading ? "..." : "Guardar"}</Button>
        </form>
      </div>
    </div>
  );
}
