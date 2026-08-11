-- Coaches can update athlete profiles (fix names, etc.)
CREATE POLICY "Coach updates profiles" ON public.profiles
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'coach'))
WITH CHECK (public.has_role(auth.uid(), 'coach'));

-- Fix photo replacement: UPDATE policy had no WITH CHECK, so upsert failed RLS
DROP POLICY IF EXISTS "athlete updates own photo" ON storage.objects;
CREATE POLICY "athlete updates own photo" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'athlete-photos' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'coach')))
WITH CHECK (bucket_id = 'athlete-photos' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'coach')));

DROP POLICY IF EXISTS "athlete uploads own photo" ON storage.objects;
CREATE POLICY "athlete uploads own photo" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'athlete-photos' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'coach')));