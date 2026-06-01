import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

export const Route = createFileRoute("/recuperar")({ component: RecoverPage });

function RecoverPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
    toast.success("Email enviado");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">
        <Link to="/" className="block mb-8 text-center">
          <Logo size={80} withText={false} />
        </Link>
        <h1 className="text-3xl mb-2">Recuperar contraseña</h1>
        <p className="text-sm text-muted-foreground mb-6">Te enviaremos un enlace para crear una contraseña nueva.</p>
        {sent ? (
          <div className="border border-border p-4 text-sm">
            Revisa tu bandeja de entrada en <strong>{email}</strong>. El enlace expira en una hora.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="em">Email</Label>
              <Input id="em" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <Button type="submit" disabled={loading} className="w-full">{loading ? "..." : "Enviar enlace"}</Button>
          </form>
        )}
        <p className="mt-6 text-sm text-center text-muted-foreground">
          <Link to="/login" className="text-foreground underline">Volver al inicio de sesión</Link>
        </p>
      </div>
    </div>
  );
}
