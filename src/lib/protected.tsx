import { useEffect, type ReactNode } from "react";
import { useNavigate, useRouterState, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { RugbyLoader } from "@/components/RugbyLoader";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { coachTypeLabel } from "@/lib/positions";
import { Clock, XCircle } from "lucide-react";

export function Protected({ children, requireRole }: { children: ReactNode; requireRole?: "atleta" | "coach" }) {
  const { user, role, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [checking, setChecking] = useState(requireRole === "atleta");
  const [application, setApplication] = useState<any | null | undefined>(undefined);

  // No role yet? The user may be a coach awaiting admin validation.
  useEffect(() => {
    if (loading || !user || role) { setApplication(undefined); return; }
    (async () => {
      const { data } = await supabase.from("coach_applications").select("*").eq("user_id", user.id).maybeSingle();
      setApplication(data ?? null);
    })();
  }, [user, role, loading]);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    if (requireRole && role && role !== requireRole) {
      navigate({ to: role === "coach" ? "/coach" : "/atleta" });
      return;
    }
    if (requireRole === "atleta" && role === "atleta" && pathname !== "/atleta/onboarding") {
      (async () => {
        const { data } = await supabase.from("profiles").select("onboarded").eq("id", user.id).maybeSingle();
        if (data && !data.onboarded) navigate({ to: "/atleta/onboarding" });
        setChecking(false);
      })();
    } else {
      setChecking(false);
    }
  }, [user, role, loading, requireRole, navigate, pathname]);

  if (!loading && user && !role && application) {
    return <PendingScreen application={application} onSignOut={async () => { await signOut(); navigate({ to: "/login" }); }} />;
  }

  if (loading || !user || (requireRole && role !== requireRole) || checking) {
    return <div className="min-h-screen flex items-center justify-center"><RugbyLoader /></div>;
  }

  return <>{children}</>;
}

function PendingScreen({ application, onSignOut }: { application: any; onSignOut: () => void }) {
  const rejected = application.status === "rejected";
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md text-center">
        <Link to="/" className="block mb-8">
          <Logo size={72} withText={false} />
          <p className="font-display text-sm tracking-wider mt-2">EL TORO RUGBY · CALVIÀ</p>
        </Link>
        <div className="border-2 border-black p-6">
          <div className="flex justify-center mb-3">
            {rejected ? <XCircle className="h-10 w-10" /> : <Clock className="h-10 w-10" />}
          </div>
          <h1 className="text-2xl mb-2">{rejected ? "Solicitud rechazada" : "Perfil pendiente de validación"}</h1>
          <p className="text-sm text-muted-foreground">
            {rejected
              ? "El administrador no ha habilitado tu acceso. Ponte en contacto con él si crees que es un error."
              : `Tu registro como ${coachTypeLabel(application.coach_type).toLowerCase()} fue recibido. El administrador debe validarlo antes de que puedas acceder al panel.`}
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            Vuelve a iniciar sesión más tarde para comprobar el estado.
          </p>
          <Button variant="outline" className="mt-5 w-full" onClick={onSignOut}>Cerrar sesión</Button>
        </div>
      </div>
    </div>
  );
}
