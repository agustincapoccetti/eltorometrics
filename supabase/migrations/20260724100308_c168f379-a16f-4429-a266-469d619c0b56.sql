-- Tighten physio_slots update policy with WITH CHECK
DROP POLICY IF EXISTS "Athlete or coach update slot" ON public.physio_slots;
CREATE POLICY "Athlete or coach update slot"
ON public.physio_slots
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'coach'::app_role)
  OR reserved_by IS NULL
  OR reserved_by = auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), 'coach'::app_role)
  OR reserved_by IS NULL
  OR reserved_by = auth.uid()
);

-- Revoke anon EXECUTE from admin/role-check SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon;