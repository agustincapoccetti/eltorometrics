
-- ============ PROFILES additions ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS onboarded BOOLEAN NOT NULL DEFAULT false;

-- ============ STORAGE bucket for athlete photos ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('athlete-photos', 'athlete-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "athlete photos public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'athlete-photos');

CREATE POLICY "athlete uploads own photo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'athlete-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "athlete updates own photo"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'athlete-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "athlete deletes own photo"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'athlete-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============ CALENDAR events ============
CREATE TYPE public.event_type AS ENUM ('training', 'match');

CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date DATE NOT NULL,
  event_time TIME,
  duration_minutes INTEGER,
  name TEXT NOT NULL,
  type public.event_type NOT NULL DEFAULT 'training',
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_calendar_events_date ON public.calendar_events(event_date);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view events"
ON public.calendar_events FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Coach insert events"
ON public.calendar_events FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'coach'));

CREATE POLICY "Coach update events"
ON public.calendar_events FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'coach'));

CREATE POLICY "Coach delete events"
ON public.calendar_events FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'coach'));

-- ============ RECOVERY ============
CREATE TABLE public.recovery_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  points INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.recovery_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view strategies"
ON public.recovery_strategies FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Coach manage strategies insert"
ON public.recovery_strategies FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'coach'));
CREATE POLICY "Coach manage strategies update"
ON public.recovery_strategies FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'coach'));
CREATE POLICY "Coach manage strategies delete"
ON public.recovery_strategies FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'coach'));

CREATE TABLE public.recovery_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entry_date DATE NOT NULL,
  total_score INTEGER NOT NULL DEFAULT 0,
  max_score INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, entry_date)
);
ALTER TABLE public.recovery_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own recovery or coach"
ON public.recovery_entries FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'coach'));

CREATE POLICY "Insert own recovery"
ON public.recovery_entries FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Update own recovery"
ON public.recovery_entries FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Delete own recovery"
ON public.recovery_entries FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE TABLE public.recovery_entry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.recovery_entries(id) ON DELETE CASCADE,
  strategy_id UUID NOT NULL REFERENCES public.recovery_strategies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entry_id, strategy_id)
);
ALTER TABLE public.recovery_entry_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own items or coach"
ON public.recovery_entry_items FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'coach'));

CREATE POLICY "Insert own items"
ON public.recovery_entry_items FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Delete own items"
ON public.recovery_entry_items FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Seed initial strategies
INSERT INTO public.recovery_strategies (name, description, points, sort_order) VALUES
  ('Sueño de 8+ horas', 'Dormir al menos 8 horas la noche posterior al entrenamiento', 3, 1),
  ('Hidratación adecuada', 'Beber al menos 2L de agua durante el día', 2, 2),
  ('Comida post-entrenamiento', 'Comida con proteína + carbohidratos en la primera hora', 2, 3),
  ('Estiramiento / movilidad', 'Sesión de 10-15 min de movilidad o estiramientos', 2, 4),
  ('Ducha fría / contraste', 'Ducha fría o de contraste post-sesión', 1, 5),
  ('Roller / liberación miofascial', 'Foam roller o pelota en zonas cargadas', 1, 6),
  ('Caminata regenerativa', 'Caminata suave de 20-30 min', 1, 7),
  ('Cero alcohol', 'No consumir alcohol en el día', 2, 8),
  ('Siesta corta', 'Siesta de 20-30 min', 1, 9),
  ('Respiración / meditación', '5-10 min de respiración consciente o meditación', 1, 10);
