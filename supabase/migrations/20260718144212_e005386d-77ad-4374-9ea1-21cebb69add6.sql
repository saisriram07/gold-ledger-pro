
CREATE POLICY "Users manage own customer photos - select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'customer-photos' AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
    )
  );
CREATE POLICY "Users manage own customer photos - insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'customer-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Users manage own customer photos - update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'customer-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Users manage own customer photos - delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'customer-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
