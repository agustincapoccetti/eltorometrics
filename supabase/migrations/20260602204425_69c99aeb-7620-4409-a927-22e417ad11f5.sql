CREATE TABLE public.library_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  url text NOT NULL,
  category text NOT NULL CHECK (category IN ('rugby','gym','fisio')),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_items TO authenticated;
GRANT ALL ON public.library_items TO service_role;

ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view library" ON public.library_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coach insert library" ON public.library_items FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'coach'));
CREATE POLICY "Coach update library" ON public.library_items FOR UPDATE TO authenticated USING (has_role(auth.uid(),'coach'));
CREATE POLICY "Coach delete library" ON public.library_items FOR DELETE TO authenticated USING (has_role(auth.uid(),'coach'));

CREATE TRIGGER update_library_items_updated_at BEFORE UPDATE ON public.library_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
