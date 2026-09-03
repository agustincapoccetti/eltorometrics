CREATE TABLE public.library_folders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_folders TO authenticated;
GRANT ALL ON public.library_folders TO service_role;

ALTER TABLE public.library_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view folders"
  ON public.library_folders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coaches can insert folders"
  ON public.library_folders FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'coach'));
CREATE POLICY "Coaches can update folders"
  ON public.library_folders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'coach'));
CREATE POLICY "Coaches can delete folders"
  ON public.library_folders FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'coach'));

CREATE TRIGGER library_folders_updated_at
  BEFORE UPDATE ON public.library_folders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.library_items
  ADD COLUMN folder_id uuid REFERENCES public.library_folders(id) ON DELETE SET NULL;

CREATE INDEX library_items_folder_idx ON public.library_items (folder_id);