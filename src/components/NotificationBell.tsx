import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { tryShowPush, requestPushPermission, getPushPermission, ensureServiceWorker } from "@/lib/notifications";
import { toast } from "sonner";

interface Notif {
  id: string; title: string; body: string | null; link: string | null;
  kind: string; read: boolean; created_at: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [list, setList] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");

  async function load() {
    if (!user) return;
    const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30);
    setList((data ?? []) as Notif[]);
  }

  useEffect(() => {
    if (!user) return;
    load();
    // Try to enable browser push once per session (best-effort)
    requestPushPermission();
    // Realtime new notifications
    const ch = supabase.channel(`notif-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload: any) => {
        setList((cur) => [payload.new as Notif, ...cur]);
        tryShowPush(payload.new.title, payload.new.body ?? undefined);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const unread = list.filter((n) => !n.read).length;

  async function markAllRead() {
    if (!user || unread === 0) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setList((cur) => cur.map((n) => ({ ...n, read: true })));
  }

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) markAllRead(); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[9px] flex items-center justify-center font-medium">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 max-h-[60vh] overflow-y-auto">
        <div className="p-3 border-b border-border">
          <p className="text-xs uppercase tracking-widest font-medium">Notificaciones</p>
        </div>
        {list.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Sin notificaciones.</p>
        ) : list.map((n) => {
          const content = (
            <div className={`p-3 border-b border-border last:border-0 hover:bg-accent ${n.read ? "" : "bg-accent/40"}`}>
              <p className="text-sm font-medium">{n.title}</p>
              {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
              <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString("es")}</p>
            </div>
          );
          return n.link ? (
            <Link key={n.id} to={n.link} onClick={() => setOpen(false)}>{content}</Link>
          ) : <div key={n.id}>{content}</div>;
        })}
      </PopoverContent>
    </Popover>
  );
}
