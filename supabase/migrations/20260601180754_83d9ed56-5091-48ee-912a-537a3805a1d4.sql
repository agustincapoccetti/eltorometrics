
-- Recurring schedules (training or physio slot blocks)
CREATE TABLE public.recurring_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('training','physio_slot')),
  name text NOT NULL,
  weekdays int[] NOT NULL DEFAULT '{}', -- 0=Sun..6=Sat
  start_time time NOT NULL,
  duration_minutes int NOT NULL DEFAULT 60,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  active boolean NOT NULL DEFAULT true,
  event_type event_type, -- for training kind
  appointment_type text, -- for physio kind
  slot_interval_minutes int DEFAULT 15, -- for physio kind: how often to spawn slots within window
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.recurring_schedules TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.recurring_schedules TO authenticated;
GRANT ALL ON public.recurring_schedules TO service_role;

ALTER TABLE public.recurring_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view schedules" ON public.recurring_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coach insert schedules" ON public.recurring_schedules FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'coach'));
CREATE POLICY "Coach update schedules" ON public.recurring_schedules FOR UPDATE TO authenticated USING (has_role(auth.uid(),'coach'));
CREATE POLICY "Coach delete schedules" ON public.recurring_schedules FOR DELETE TO authenticated USING (has_role(auth.uid(),'coach'));

CREATE TRIGGER trg_recurring_schedules_updated BEFORE UPDATE ON public.recurring_schedules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Physio slots (open appointments athletes can book)
CREATE TABLE public.physio_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_date date NOT NULL,
  start_time time NOT NULL,
  duration_minutes int NOT NULL DEFAULT 15,
  appointment_type text NOT NULL DEFAULT 'fisio_club',
  reserved_by uuid,
  reserved_at timestamptz,
  recurring_schedule_id uuid REFERENCES public.recurring_schedules(id) ON DELETE SET NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slot_date, start_time, appointment_type)
);

GRANT SELECT ON public.physio_slots TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.physio_slots TO authenticated;
GRANT ALL ON public.physio_slots TO service_role;

ALTER TABLE public.physio_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view slots" ON public.physio_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coach insert slots" ON public.physio_slots FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'coach'));
CREATE POLICY "Coach delete slots" ON public.physio_slots FOR DELETE TO authenticated USING (has_role(auth.uid(),'coach'));
-- Athletes may update only to reserve/cancel their own; coach may always update
CREATE POLICY "Athlete or coach update slot" ON public.physio_slots FOR UPDATE TO authenticated USING (
  has_role(auth.uid(),'coach') OR reserved_by IS NULL OR reserved_by = auth.uid()
);

CREATE TRIGGER trg_physio_slots_updated BEFORE UPDATE ON public.physio_slots FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Atomic slot reservation function (creates physio_appointment and marks slot)
CREATE OR REPLACE FUNCTION public.reserve_physio_slot(_slot_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _slot record;
  _appt_id uuid;
BEGIN
  SELECT * INTO _slot FROM public.physio_slots WHERE id = _slot_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Turno no encontrado'; END IF;
  IF _slot.reserved_by IS NOT NULL THEN RAISE EXCEPTION 'Ese turno ya está reservado'; END IF;

  UPDATE public.physio_slots
    SET reserved_by = auth.uid(), reserved_at = now()
    WHERE id = _slot_id;

  INSERT INTO public.physio_appointments (user_id, appointment_type, appointment_date, appointment_time, reasons, status, created_by)
  VALUES (auth.uid(), _slot.appointment_type, _slot.slot_date, _slot.start_time, '{}', 'scheduled', auth.uid())
  RETURNING id INTO _appt_id;

  RETURN _appt_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_physio_slot(_slot_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _slot record;
BEGIN
  SELECT * INTO _slot FROM public.physio_slots WHERE id=_slot_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Turno no encontrado'; END IF;
  IF _slot.reserved_by IS NULL THEN RETURN; END IF;
  IF _slot.reserved_by <> auth.uid() AND NOT has_role(auth.uid(),'coach') THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  -- Delete matching appointment
  DELETE FROM public.physio_appointments
    WHERE user_id = _slot.reserved_by
      AND appointment_date = _slot.slot_date
      AND appointment_time = _slot.start_time
      AND appointment_type = _slot.appointment_type;
  UPDATE public.physio_slots SET reserved_by = NULL, reserved_at = NULL WHERE id = _slot_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reserve_physio_slot(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_physio_slot(uuid) TO authenticated;
