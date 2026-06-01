import { useEffect, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { RugbyLoader } from "@/components/RugbyLoader";


export function Protected({ children, requireRole }: { children: ReactNode; requireRole?: "atleta" | "coach" }) {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [checking, setChecking] = useState(requireRole === "atleta");

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

  if (loading || !user || (requireRole && role !== requireRole) || checking) {
    return <div className="min-h-screen flex items-center justify-center"><RugbyLoader /></div>;
  }

  return <>{children}</>;
}
