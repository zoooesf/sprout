-- Create the photos storage bucket (public, so URLs are directly accessible)
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload photos for their own family's subjects
CREATE POLICY "Family members can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'photos'
  AND EXISTS (
    SELECT 1 FROM subjects s
    JOIN profiles p ON p.family_id = s.family_id
    WHERE s.id::text = (storage.foldername(name))[1]
      AND p.id = auth.uid()
  )
);

-- Allow authenticated users to read photos for their own family's subjects
CREATE POLICY "Family members can read photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'photos'
  AND EXISTS (
    SELECT 1 FROM subjects s
    JOIN profiles p ON p.family_id = s.family_id
    WHERE s.id::text = (storage.foldername(name))[1]
      AND p.id = auth.uid()
  )
);

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Family members can delete photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'photos'
  AND EXISTS (
    SELECT 1 FROM subjects s
    JOIN profiles p ON p.family_id = s.family_id
    WHERE s.id::text = (storage.foldername(name))[1]
      AND p.id = auth.uid()
  )
);
