CREATE POLICY "Authenticated can read library files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'library-files');

CREATE POLICY "Coaches can upload library files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'library-files' AND public.has_role(auth.uid(), 'coach'));

CREATE POLICY "Coaches can update library files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'library-files' AND public.has_role(auth.uid(), 'coach'))
WITH CHECK (bucket_id = 'library-files' AND public.has_role(auth.uid(), 'coach'));

CREATE POLICY "Coaches can delete library files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'library-files' AND public.has_role(auth.uid(), 'coach'));