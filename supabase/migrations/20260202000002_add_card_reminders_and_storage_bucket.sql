-- Adds card reminders and a Supabase Storage bucket for real card attachment files.

ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS reminder_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_cards_reminder_at ON cards(reminder_at);

INSERT INTO storage.buckets (id, name, public)
VALUES ('card-attachments', 'card-attachments', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Board members can view card attachment files" ON storage.objects;
CREATE POLICY "Board members can view card attachment files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'card-attachments');

DROP POLICY IF EXISTS "Authenticated users can upload card attachment files" ON storage.objects;
CREATE POLICY "Authenticated users can upload card attachment files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'card-attachments');

DROP POLICY IF EXISTS "Authenticated users can update card attachment files" ON storage.objects;
CREATE POLICY "Authenticated users can update card attachment files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'card-attachments')
  WITH CHECK (bucket_id = 'card-attachments');

DROP POLICY IF EXISTS "Authenticated users can delete card attachment files" ON storage.objects;
CREATE POLICY "Authenticated users can delete card attachment files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'card-attachments');

