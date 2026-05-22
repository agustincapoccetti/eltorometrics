CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;$$;

CREATE TABLE public.physio_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME,
  reasons TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.physio_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own physio or coach" ON public.physio_appointments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'coach'));
CREATE POLICY "Insert own physio" ON public.physio_appointments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own physio" ON public.physio_appointments
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Delete own physio" ON public.physio_appointments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_physio_user_date ON public.physio_appointments(user_id, appointment_date);

CREATE TRIGGER trg_physio_updated_at BEFORE UPDATE ON public.physio_appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();