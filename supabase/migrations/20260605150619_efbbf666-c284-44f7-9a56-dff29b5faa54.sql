
-- Attendance tracking
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  attendance_date date NOT NULL,
  present boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, attendance_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view attendance" ON public.attendance FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'coach'));
CREATE POLICY "Coach insert attendance" ON public.attendance FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'coach'));
CREATE POLICY "Coach update attendance" ON public.attendance FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'coach'));
CREATE POLICY "Coach delete attendance" ON public.attendance FOR DELETE TO authenticated USING (has_role(auth.uid(), 'coach'));
CREATE TRIGGER trg_attendance_updated BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Matches
CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_date date NOT NULL,
  opponent text NOT NULL DEFAULT '',
  location text,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view matches" ON public.matches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coach insert matches" ON public.matches FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'coach'));
CREATE POLICY "Coach update matches" ON public.matches FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'coach'));
CREATE POLICY "Coach delete matches" ON public.matches FOR DELETE TO authenticated USING (has_role(auth.uid(), 'coach'));
CREATE TRIGGER trg_matches_updated BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Match participations
CREATE TABLE public.match_participations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  convoked boolean NOT NULL DEFAULT true,
  minutes_played integer NOT NULL DEFAULT 0,
  injury boolean NOT NULL DEFAULT false,
  injury_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_participations TO authenticated;
GRANT ALL ON public.match_participations TO service_role;
ALTER TABLE public.match_participations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view participations" ON public.match_participations FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'coach'));
CREATE POLICY "Coach insert participations" ON public.match_participations FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'coach'));
CREATE POLICY "Coach update participations" ON public.match_participations FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'coach'));
CREATE POLICY "Coach delete participations" ON public.match_participations FOR DELETE TO authenticated USING (has_role(auth.uid(), 'coach'));
CREATE TRIGGER trg_participations_updated BEFORE UPDATE ON public.match_participations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
