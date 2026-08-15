CREATE TABLE public.training_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_date date NOT NULL,
  plan_time time,
  duration_minutes integer,
  name text NOT NULL,
  type event_type NOT NULL DEFAULT 'training',
  description text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_plans TO authenticated;
GRANT ALL ON public.training_plans TO service_role;

ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view plans" ON public.training_plans FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'coach'));
CREATE POLICY "Coaches can create plans" ON public.training_plans FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'coach'));
CREATE POLICY "Coaches can update plans" ON public.training_plans FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'coach')) WITH CHECK (public.has_role(auth.uid(), 'coach'));
CREATE POLICY "Coaches can delete plans" ON public.training_plans FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'coach'));

CREATE TRIGGER trg_training_plans_updated BEFORE UPDATE ON public.training_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX training_plans_date_idx ON public.training_plans (plan_date);

INSERT INTO public.training_plans (plan_date, plan_time, duration_minutes, name, type, description, created_by)
SELECT event_date, event_time, duration_minutes, name, type, description, created_by
FROM public.calendar_events
WHERE description IS NOT NULL AND btrim(description) <> '';