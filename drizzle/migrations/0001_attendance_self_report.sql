CREATE TABLE public.attendance_prompts (
  event_date date PRIMARY KEY,
  sent_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.attendance_prompts TO service_role;
ALTER TABLE public.attendance_prompts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.self_report_attendance(_date date, _present boolean)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'Europe/Madrid')::date;
  _existing record;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'atleta') THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF _date > _today OR _date < _today - 1 THEN
    RAISE EXCEPTION 'Solo puedes responder el día del entrenamiento';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.calendar_events WHERE event_date = _date AND type = 'training') THEN
    RAISE EXCEPTION 'Ese día no hay entrenamiento';
  END IF;
  SELECT * INTO _existing FROM public.attendance WHERE user_id = _uid AND attendance_date = _date;
  IF FOUND THEN
    IF _existing.source IN ('manual','rpe') THEN
      RETURN 'locked';
    END IF;
    UPDATE public.attendance SET present = _present, updated_at = now() WHERE id = _existing.id;
    RETURN 'updated';
  END IF;
  INSERT INTO public.attendance (user_id, attendance_date, present, source, created_by)
  VALUES (_uid, _date, _present, 'self', _uid);
  RETURN 'created';
END;
$$;
REVOKE ALL ON FUNCTION public.self_report_attendance(date, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.self_report_attendance(date, boolean) TO authenticated;