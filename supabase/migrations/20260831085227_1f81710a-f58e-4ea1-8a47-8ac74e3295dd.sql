CREATE TABLE public.availability_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  options text[] NOT NULL DEFAULT '{}',
  multi boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  closes_at timestamptz,
  event_date date,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_polls TO authenticated;
GRANT ALL ON public.availability_polls TO service_role;
ALTER TABLE public.availability_polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "polls_select_auth" ON public.availability_polls FOR SELECT TO authenticated USING (true);
CREATE POLICY "polls_insert_coach" ON public.availability_polls FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'coach') AND created_by = auth.uid());
CREATE POLICY "polls_update_coach" ON public.availability_polls FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'coach')) WITH CHECK (public.has_role(auth.uid(),'coach'));
CREATE POLICY "polls_delete_coach" ON public.availability_polls FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'coach'));
CREATE TRIGGER trg_availability_polls_updated BEFORE UPDATE ON public.availability_polls FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.availability_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.availability_polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  selected text[] NOT NULL DEFAULT '{}',
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_responses TO authenticated;
GRANT ALL ON public.availability_responses TO service_role;
ALTER TABLE public.availability_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "resp_select_own_or_coach" ON public.availability_responses FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'coach'));
CREATE POLICY "resp_insert_own" ON public.availability_responses FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "resp_update_own" ON public.availability_responses FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "resp_delete_own_or_coach" ON public.availability_responses FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'coach'));
CREATE TRIGGER trg_availability_responses_updated BEFORE UPDATE ON public.availability_responses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();