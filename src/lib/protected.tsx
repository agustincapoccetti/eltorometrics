import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";

export function Protected({ children, requireRole }: { children: ReactNode; requireRole?: "atleta" | "coach" }) {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (requireRole && role && role !== requireRole) {
      navigate({ to: role === "coach" ? "/coach" : "/atleta" });
    }
  }, [user, role, loading, requireRole, navigate]);

  if (loading || !user || (requireRole && role !== requireRole)) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Cargando...</div>;
  }
  return <>{children}</>;
}
