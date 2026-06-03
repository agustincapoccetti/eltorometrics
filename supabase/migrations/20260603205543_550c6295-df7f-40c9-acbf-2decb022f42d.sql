REVOKE EXECUTE ON FUNCTION public.reserve_physio_slot(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_physio_slot(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.cancel_physio_slot(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_physio_slot(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.free_physio_slot_on_appt_change() FROM PUBLIC, anon, authenticated;