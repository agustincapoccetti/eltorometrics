CREATE OR REPLACE FUNCTION public.reserve_physio_slot(_slot_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _slot record;
  _appt_id uuid;
BEGIN
  SELECT * INTO _slot FROM public.physio_slots WHERE id = _slot_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Turno no encontrado'; END IF;
  IF _slot.reserved_by IS NOT NULL THEN RAISE EXCEPTION 'Ese turno ya está reservado'; END IF;

  IF EXISTS (
    SELECT 1
    FROM public.physio_appointments
    WHERE user_id = auth.uid()
      AND appointment_date = _slot.slot_date
      AND appointment_type = _slot.appointment_type
      AND status <> 'cancelled'
  ) THEN
    RAISE EXCEPTION 'Ya tienes una cita activa de este tipo para ese día';
  END IF;

  UPDATE public.physio_slots
    SET reserved_by = auth.uid(), reserved_at = now()
    WHERE id = _slot_id;

  INSERT INTO public.physio_appointments (user_id, appointment_type, appointment_date, appointment_time, reasons, status, created_by)
  VALUES (auth.uid(), _slot.appointment_type, _slot.slot_date, _slot.start_time, '{}', 'scheduled', auth.uid())
  RETURNING id INTO _appt_id;

  RETURN _appt_id;
END;
$$;