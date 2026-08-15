import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "atleta" | "coach";

const VIEW_KEY = "etr-active-view";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  /** Rol de la vista activa (para usuarios con doble rol) */
  role: Role | null;
  /** Todos los roles asignados al usuario */
  roles: Role[];
  loading: boolean;
  setActiveRole: (r: Role) => void;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

function readStoredView(): Role | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(VIEW_KEY);
  return v === "atleta" || v === "coach" ? v : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [active, setActive] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRoles = async (uid: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    const list = Array.from(new Set((data ?? []).map((r) => r.role as Role)));
    setRoles(list);
    setActive((prev) => {
      if (prev && list.includes(prev)) return prev;
      const stored = readStoredView();
      if (stored && list.includes(stored)) return stored;
      // Coach por defecto cuando tiene ambos roles
      return list.includes("coach") ? "coach" : (list[0] ?? null);
    });
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) setTimeout(() => loadRoles(s.user.id), 0);
      else { setRoles([]); setActive(null); }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadRoles(data.session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const setActiveRole = (r: Role) => {
    setActive(r);
    if (typeof window !== "undefined") window.localStorage.setItem(VIEW_KEY, r);
  };

  const value: AuthCtx = {
    user: session?.user ?? null,
    session,
    role: active,
    roles,
    loading,
    setActiveRole,
    signOut: async () => {
      if (typeof window !== "undefined") window.localStorage.removeItem(VIEW_KEY);
      await supabase.auth.signOut();
    },
    refreshRole: async () => { if (session?.user) await loadRoles(session.user.id); },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
