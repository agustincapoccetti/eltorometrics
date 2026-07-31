-- 1) Coach type on profile
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coach_type text;

-- 2) Coach applications (pending approval by admin)
CREATE TABLE public.coach_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  email text NOT NULL,
  full_name text,
  coach_type text NOT NULL CHECK (coach_type IN ('preparador_fisico','fisio','entrenador')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  decided_at timestamp with time zone,
  decided_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.coach_applications TO authenticated;
GRANT ALL ON public.coach_applications TO service_role;

ALTER TABLE public.coach_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own application or admin"
  ON public.coach_applications FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Admin updates applications"
  ON public.coach_applications FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER coach_applications_updated_at
  BEFORE UPDATE ON public.coach_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) New signup flow: coaches stay pending until admin approves
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _role app_role;
  _weight numeric;
  _email text := lower(coalesce(NEW.email,''));
  _is_admin boolean := (_email = 'agustincapoccetti@hotmail.com');
  _coach_type text := NULLIF(NEW.raw_user_meta_data->>'coach_type','');
BEGIN
  _role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'atleta');
  _weight := NULLIF(NEW.raw_user_meta_data->>'weight','')::numeric;

  IF _role = 'coach' AND _coach_type IS NULL THEN
    _coach_type := 'preparador_fisico';
  END IF;
  IF _coach_type IS NOT NULL AND _coach_type NOT IN ('preparador_fisico','fisio','entrenador') THEN
    _coach_type := 'preparador_fisico';
  END IF;

  INSERT INTO public.profiles (id, full_name, position, weight, height, last_weight_update, coach_type, onboarded)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    NEW.raw_user_meta_data->>'position',
    _weight,
    NULLIF(NEW.raw_user_meta_data->>'height','')::numeric,
    CASE WHEN _weight IS NOT NULL THEN now() ELSE NULL END,
    CASE WHEN _role = 'coach' THEN _coach_type ELSE NULL END,
    CASE WHEN _role = 'coach' THEN true ELSE false END
  );

  IF _role = 'coach' THEN
    INSERT INTO public.coach_applications (user_id, email, full_name, coach_type, status, decided_at)
    VALUES (
      NEW.id, _email, COALESCE(NEW.raw_user_meta_data->>'full_name',''), _coach_type,
      CASE WHEN _is_admin THEN 'approved' ELSE 'pending' END,
      CASE WHEN _is_admin THEN now() ELSE NULL END
    );
    IF _is_admin THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'coach');
    END IF;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'atleta');
    IF _weight IS NOT NULL THEN
      INSERT INTO public.weight_history (user_id, weight) VALUES (NEW.id, _weight);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 4) Coaches can fill/fix athlete questionnaires
CREATE POLICY "Coach inserts rpe" ON public.rpe_entries FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'coach'));
CREATE POLICY "Coach updates rpe" ON public.rpe_entries FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'coach')) WITH CHECK (public.has_role(auth.uid(), 'coach'));
CREATE POLICY "Coach deletes rpe" ON public.rpe_entries FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'coach'));

CREATE POLICY "Coach inserts wellness" ON public.wellness_entries FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'coach'));
CREATE POLICY "Coach updates wellness" ON public.wellness_entries FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'coach')) WITH CHECK (public.has_role(auth.uid(), 'coach'));
CREATE POLICY "Coach deletes wellness" ON public.wellness_entries FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'coach'));