
-- Physio: tipo de cita + creador
ALTER TABLE public.physio_appointments
  ADD COLUMN IF NOT EXISTS appointment_type text NOT NULL DEFAULT 'fisio_club',
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- Coaches pueden ver, crear, actualizar y borrar citas
DROP POLICY IF EXISTS "Coach insert physio" ON public.physio_appointments;
DROP POLICY IF EXISTS "Coach update physio" ON public.physio_appointments;
DROP POLICY IF EXISTS "Coach delete physio" ON public.physio_appointments;
CREATE POLICY "Coach insert physio" ON public.physio_appointments
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'coach'));
CREATE POLICY "Coach update physio" ON public.physio_appointments
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'coach'));
CREATE POLICY "Coach delete physio" ON public.physio_appointments
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'coach'));

-- Iconos para estrategias de recuperación
ALTER TABLE public.recovery_strategies
  ADD COLUMN IF NOT EXISTS icon text;

UPDATE public.recovery_strategies SET icon = CASE
  WHEN lower(name) LIKE '%sueño%' OR lower(name) LIKE '%dorm%' THEN '😴'
  WHEN lower(name) LIKE '%hidrat%' OR lower(name) LIKE '%agua%' THEN '💧'
  WHEN lower(name) LIKE '%estir%' OR lower(name) LIKE '%movil%' THEN '🧘'
  WHEN lower(name) LIKE '%foam%' OR lower(name) LIKE '%rol%' THEN '🧻'
  WHEN lower(name) LIKE '%frío%' OR lower(name) LIKE '%hielo%' OR lower(name) LIKE '%baño%' THEN '🧊'
  WHEN lower(name) LIKE '%proteí%' OR lower(name) LIKE '%comid%' OR lower(name) LIKE '%nutri%' THEN '🥗'
  WHEN lower(name) LIKE '%masaj%' THEN '💆'
  WHEN lower(name) LIKE '%presoter%' OR lower(name) LIKE '%bota%' THEN '🦵'
  WHEN lower(name) LIKE '%medit%' OR lower(name) LIKE '%respir%' THEN '🧠'
  WHEN lower(name) LIKE '%caminar%' OR lower(name) LIKE '%suav%' THEN '🚶'
  ELSE '✅'
END WHERE icon IS NULL;

-- Notificaciones in-app
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  kind text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON public.notifications(user_id, read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View own notif or coach" ON public.notifications;
DROP POLICY IF EXISTS "Coach insert notif" ON public.notifications;
DROP POLICY IF EXISTS "Update own notif" ON public.notifications;
DROP POLICY IF EXISTS "Delete own notif" ON public.notifications;

CREATE POLICY "View own notif or coach" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'coach'));
CREATE POLICY "Coach insert notif" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'coach') OR auth.uid() = created_by);
CREATE POLICY "Update own notif" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Delete own notif" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'coach'));
