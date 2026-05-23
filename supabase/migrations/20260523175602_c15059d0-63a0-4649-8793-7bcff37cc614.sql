
-- =========================================================
-- 1) Coach invitations + admin enforcement
-- =========================================================
CREATE TABLE IF NOT EXISTS public.coach_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  used boolean NOT NULL DEFAULT false,
  used_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_invites ENABLE ROW LEVEL SECURITY;

-- Admin email helper
CREATE OR REPLACE FUNCTION public.is_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _uid AND lower(email) = 'agustincapoccetti@hotmail.com'
  )
$$;

CREATE POLICY "Admin manages invites select" ON public.coach_invites
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin manages invites insert" ON public.coach_invites
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admin manages invites update" ON public.coach_invites
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin manages invites delete" ON public.coach_invites
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- Replace handle_new_user to enforce coach allowlist + max 5 coaches
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _role app_role;
  _weight numeric;
  _email text := lower(coalesce(NEW.email,''));
  _is_admin boolean := (_email = 'agustincapoccetti@hotmail.com');
  _invited boolean;
  _coach_count int;
BEGIN
  _role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'atleta');
  _weight := NULLIF(NEW.raw_user_meta_data->>'weight','')::numeric;

  IF _role = 'coach' AND NOT _is_admin THEN
    SELECT EXISTS (SELECT 1 FROM public.coach_invites WHERE lower(email)=_email AND used=false)
      INTO _invited;
    IF NOT _invited THEN
      RAISE EXCEPTION 'Email no autorizado como coach. Pedile al admin que te invite.';
    END IF;
    SELECT count(*) INTO _coach_count FROM public.user_roles WHERE role='coach';
    IF _coach_count >= 6 THEN  -- admin + 5
      RAISE EXCEPTION 'Se alcanzó el máximo de coaches permitidos.';
    END IF;
    UPDATE public.coach_invites SET used=true, used_at=now() WHERE lower(email)=_email;
  END IF;

  INSERT INTO public.profiles (id, full_name, position, weight, height, last_weight_update)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    NEW.raw_user_meta_data->>'position',
    _weight,
    NULLIF(NEW.raw_user_meta_data->>'height','')::numeric,
    CASE WHEN _weight IS NOT NULL THEN now() ELSE NULL END
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);

  IF _weight IS NOT NULL THEN
    INSERT INTO public.weight_history (user_id, weight) VALUES (NEW.id, _weight);
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- 2) Allow athletes to edit/delete their own entries
-- =========================================================
CREATE POLICY "Update own rpe" ON public.rpe_entries
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Delete own rpe" ON public.rpe_entries
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Update own wellness" ON public.wellness_entries
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Delete own wellness" ON public.wellness_entries
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Update own weight" ON public.weight_history
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Delete own weight" ON public.weight_history
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- 3) Gym module
-- =========================================================
CREATE TABLE IF NOT EXISTS public.gym_routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  month int NOT NULL CHECK (month BETWEEN 1 AND 12),
  year int NOT NULL CHECK (year BETWEEN 2024 AND 2100),
  position text,
  pdf_path text NOT NULL,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gym_routines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view routines" ON public.gym_routines
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coach insert routine" ON public.gym_routines
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'coach'));
CREATE POLICY "Coach update routine" ON public.gym_routines
  FOR UPDATE TO authenticated USING (has_role(auth.uid(),'coach'));
CREATE POLICY "Coach delete routine" ON public.gym_routines
  FOR DELETE TO authenticated USING (has_role(auth.uid(),'coach'));

CREATE TRIGGER gym_routines_updated_at BEFORE UPDATE ON public.gym_routines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.gym_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  routine_id uuid NOT NULL REFERENCES public.gym_routines(id) ON DELETE CASCADE,
  exercise text NOT NULL,
  week int CHECK (week BETWEEN 1 AND 6),
  weight numeric,
  reps int,
  done boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gym_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own obs or coach" ON public.gym_observations
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(),'coach'));
CREATE POLICY "Insert own obs" ON public.gym_observations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own obs" ON public.gym_observations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Delete own obs" ON public.gym_observations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER gym_obs_updated_at BEFORE UPDATE ON public.gym_observations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS gym_obs_user_routine ON public.gym_observations(user_id, routine_id);

-- Storage bucket for gym PDFs (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('gym-pdfs','gym-pdfs',false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Auth read gym pdfs" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id='gym-pdfs');
CREATE POLICY "Coach upload gym pdfs" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id='gym-pdfs' AND has_role(auth.uid(),'coach'));
CREATE POLICY "Coach update gym pdfs" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id='gym-pdfs' AND has_role(auth.uid(),'coach'));
CREATE POLICY "Coach delete gym pdfs" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id='gym-pdfs' AND has_role(auth.uid(),'coach'));
