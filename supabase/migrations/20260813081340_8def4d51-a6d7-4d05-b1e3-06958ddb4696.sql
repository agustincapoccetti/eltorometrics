CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own push subs select" ON public.push_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own push subs insert" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own push subs update" ON public.push_subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own push subs delete" ON public.push_subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_push_subscriptions_updated BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.push_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  body text,
  link text,
  weekdays integer[] NOT NULL DEFAULT '{}',
  send_time time NOT NULL,
  active boolean NOT NULL DEFAULT true,
  target_role app_role NOT NULL DEFAULT 'atleta',
  last_sent_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_schedules TO authenticated;
GRANT ALL ON public.push_schedules TO service_role;
ALTER TABLE public.push_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push schedules readable" ON public.push_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "coach insert push schedules" ON public.push_schedules FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'coach') AND auth.uid() = created_by);
CREATE POLICY "coach update push schedules" ON public.push_schedules FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'coach')) WITH CHECK (public.has_role(auth.uid(), 'coach'));
CREATE POLICY "coach delete push schedules" ON public.push_schedules FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'coach'));

CREATE TRIGGER trg_push_schedules_updated BEFORE UPDATE ON public.push_schedules
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();