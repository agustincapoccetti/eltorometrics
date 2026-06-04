
DROP POLICY IF EXISTS "athlete photos auth read" ON storage.objects;
-- Public bucket continues to serve files via the public CDN URL without any SELECT policy.
