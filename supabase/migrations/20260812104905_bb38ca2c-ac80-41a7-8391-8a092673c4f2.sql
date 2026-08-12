ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'coach';

CREATE OR REPLACE FUNCTION public.mark_attendance_from_rpe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.attendance (user_id, attendance_date, present, created_by, source, notes)
  VALUES (NEW.user_id, NEW.session_date, true, NEW.user_id, 'rpe', 'Automático por RPE')
  ON CONFLICT (user_id, attendance_date) DO UPDATE
    SET present = true,
        source = 'rpe',
        notes = COALESCE(public.attendance.notes, 'Automático por RPE'),
        updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_attendance_from_rpe ON public.rpe_entries;
CREATE TRIGGER trg_attendance_from_rpe
AFTER INSERT ON public.rpe_entries
FOR EACH ROW EXECUTE FUNCTION public.mark_attendance_from_rpe();

-- Backfill attendance for existing RPE answers
INSERT INTO public.attendance (user_id, attendance_date, present, created_by, source, notes)
SELECT DISTINCT r.user_id, r.session_date, true, r.user_id, 'rpe', 'Automático por RPE'
FROM public.rpe_entries r
ON CONFLICT (user_id, attendance_date) DO UPDATE
  SET present = true, source = 'rpe', updated_at = now();

-- Merge player positions into grouped categories
UPDATE public.profiles SET position = 'Primera Línea' WHERE position IN ('Pilar','Hooker');
UPDATE public.profiles SET position = 'Tercera Línea' WHERE position IN ('Ala','Octavo');
UPDATE public.profiles SET position = 'Wings y Fullbacks' WHERE position IN ('Wing','Fullback');
