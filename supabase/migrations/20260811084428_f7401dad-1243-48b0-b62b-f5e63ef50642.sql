DROP POLICY IF EXISTS "authenticated read athlete photos" ON storage.objects;
CREATE POLICY "authenticated read athlete photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'athlete-photos');