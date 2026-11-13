-- Shared club content is readable only by database-assigned athletes and approved coaches.
ALTER POLICY "Auth view slots" ON public.physio_slots TO authenticated USING (public.has_role(auth.uid(), 'coach') OR (public.has_role(auth.uid(), 'atleta') AND (reserved_by IS NULL OR reserved_by = auth.uid())));
ALTER POLICY "Authenticated can view folders" ON public.library_folders TO authenticated USING (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'atleta'));
ALTER POLICY "Authenticated view strategies" ON public.recovery_strategies TO authenticated USING (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'atleta'));
ALTER POLICY "Todos los autenticados ven evaluaciones" ON public.evaluations TO authenticated USING (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'atleta'));
ALTER POLICY "Auth view schedules" ON public.recurring_schedules TO authenticated USING (public.has_role(auth.uid(), 'coach'));
ALTER POLICY "push schedules readable" ON public.push_schedules TO authenticated USING (public.has_role(auth.uid(), 'coach'));
ALTER POLICY "Authenticated view events" ON public.calendar_events TO authenticated USING (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'atleta'));
ALTER POLICY "Auth view library" ON public.library_items TO authenticated USING (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'atleta'));
ALTER POLICY "polls_select_auth" ON public.availability_polls TO authenticated USING (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'atleta'));
ALTER POLICY "Auth view routines" ON public.gym_routines TO authenticated USING (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'atleta'));
ALTER POLICY "Auth view matches" ON public.matches TO authenticated USING (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'atleta'));
-- Private files are shared through visible published records, not blanket bucket access.
-- Uploaders retain access before publishing; coaches retain management/preview access.
ALTER POLICY "Auth read gym pdfs" ON storage.objects TO authenticated USING (
  bucket_id = 'gym-pdfs' AND (
    owner_id = auth.uid()::text OR public.has_role(auth.uid(), 'coach') OR
    (public.has_role(auth.uid(), 'atleta') AND EXISTS (
      SELECT 1 FROM public.gym_routines r WHERE r.pdf_path = storage.objects.name
    ))
  )
);
ALTER POLICY "Authenticated can read library files" ON storage.objects TO authenticated USING (
  bucket_id = 'library-files' AND (
    owner_id = auth.uid()::text OR public.has_role(auth.uid(), 'coach') OR
    (public.has_role(auth.uid(), 'atleta') AND EXISTS (
      SELECT 1 FROM public.library_items i WHERE i.url = 'storage://library-files/' || storage.objects.name
    ))
  )
);
-- Athlete portraits are intentionally public display images; narrow authenticated
-- object listing to the caller's files or published club profile portraits.
ALTER POLICY "authenticated read athlete photos" ON storage.objects TO authenticated USING (
  bucket_id = 'athlete-photos' AND (
    owner_id = auth.uid()::text OR auth.uid()::text = (storage.foldername(name))[1] OR
    ((public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'atleta')) AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id::text = (storage.foldername(storage.objects.name))[1]
        AND p.photo_url IS NOT NULL
        AND p.photo_url LIKE '%/storage/v1/object/public/athlete-photos/' || storage.objects.name
    ))
  )
);