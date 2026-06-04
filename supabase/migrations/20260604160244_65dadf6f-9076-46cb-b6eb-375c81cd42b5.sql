
-- 1) Fix notifications INSERT policy: only coaches can insert
DROP POLICY IF EXISTS "Coach insert notif" ON public.notifications;
CREATE POLICY "Coach insert notif" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'coach'::app_role));

-- 2) Lock down SECURITY DEFINER functions not meant for direct client calls
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;
-- Keep reserve_physio_slot / cancel_physio_slot callable by authenticated users (they need it)

-- 3) Restrict listing of athlete-photos bucket to authenticated users
DROP POLICY IF EXISTS "athlete photos public read" ON storage.objects;
CREATE POLICY "athlete photos auth read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'athlete-photos');

-- 4) Allow athletes to create future appointment "requests" (no slot yet)
--    These are status='requested' rows; coach.fisio assigns them later.
--    The existing physio_appointments table already supports text status.
--    Ensure athletes can still insert their own appointments (registration of external visits + requests).
--    (No schema change required.)
