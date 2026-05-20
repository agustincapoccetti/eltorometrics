
-- Role enum and table
CREATE TYPE public.app_role AS ENUM ('atleta', 'coach');

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'coach'));

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  position TEXT,
  weight NUMERIC(5,2),
  height NUMERIC(5,2),
  last_weight_update TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own profile or coach views all" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'coach'));
CREATE POLICY "Insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- Weight history
CREATE TABLE public.weight_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight NUMERIC(5,2) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.weight_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own weight or coach" ON public.weight_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'coach'));
CREATE POLICY "Insert own weight" ON public.weight_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RPE entries
CREATE TABLE public.rpe_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  session_label TEXT,
  rpe_score INT NOT NULL CHECK (rpe_score BETWEEN 0 AND 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rpe_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own rpe or coach" ON public.rpe_entries FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'coach'));
CREATE POLICY "Insert own rpe" ON public.rpe_entries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Wellness entries
CREATE TABLE public.wellness_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  sleep INT NOT NULL CHECK (sleep BETWEEN 1 AND 5),
  stress INT NOT NULL CHECK (stress BETWEEN 1 AND 5),
  fatigue INT NOT NULL CHECK (fatigue BETWEEN 1 AND 5),
  mood INT NOT NULL CHECK (mood BETWEEN 1 AND 5),
  has_pain BOOLEAN NOT NULL DEFAULT false,
  pain_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, entry_date)
);
ALTER TABLE public.wellness_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own wellness or coach" ON public.wellness_entries FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'coach'));
CREATE POLICY "Insert own wellness" ON public.wellness_entries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Signup trigger: create profile and role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _role app_role;
  _weight NUMERIC;
BEGIN
  _role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'atleta');
  _weight := NULLIF(NEW.raw_user_meta_data->>'weight','')::NUMERIC;

  INSERT INTO public.profiles (id, full_name, position, weight, height, last_weight_update)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'position',
    _weight,
    NULLIF(NEW.raw_user_meta_data->>'height','')::NUMERIC,
    CASE WHEN _weight IS NOT NULL THEN now() ELSE NULL END
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);

  IF _weight IS NOT NULL THEN
    INSERT INTO public.weight_history (user_id, weight) VALUES (NEW.id, _weight);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
