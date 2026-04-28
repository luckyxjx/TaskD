-- Adds product-depth card metadata: lightweight URL attachments and checklist/subtask items.

CREATE TABLE IF NOT EXISTS card_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  file_type text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS card_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  title text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_card_attachments_card ON card_attachments(card_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_card_checklist_items_card ON card_checklist_items(card_id, position);

ALTER TABLE card_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Board members can view card attachments" ON card_attachments;
CREATE POLICY "Board members can view card attachments"
  ON card_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM cards c
      JOIN lists l ON l.id = c.list_id
      JOIN board_members bm ON bm.board_id = l.board_id
      WHERE c.id = card_attachments.card_id
      AND bm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Editors can manage card attachments" ON card_attachments;
CREATE POLICY "Editors can manage card attachments"
  ON card_attachments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM cards c
      JOIN lists l ON l.id = c.list_id
      JOIN board_members bm ON bm.board_id = l.board_id
      WHERE c.id = card_attachments.card_id
      AND bm.user_id = auth.uid()
      AND bm.role IN ('owner', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM cards c
      JOIN lists l ON l.id = c.list_id
      JOIN board_members bm ON bm.board_id = l.board_id
      WHERE c.id = card_attachments.card_id
      AND bm.user_id = auth.uid()
      AND bm.role IN ('owner', 'editor')
    )
  );

DROP POLICY IF EXISTS "Board members can view card checklist items" ON card_checklist_items;
CREATE POLICY "Board members can view card checklist items"
  ON card_checklist_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM cards c
      JOIN lists l ON l.id = c.list_id
      JOIN board_members bm ON bm.board_id = l.board_id
      WHERE c.id = card_checklist_items.card_id
      AND bm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Editors can manage card checklist items" ON card_checklist_items;
CREATE POLICY "Editors can manage card checklist items"
  ON card_checklist_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM cards c
      JOIN lists l ON l.id = c.list_id
      JOIN board_members bm ON bm.board_id = l.board_id
      WHERE c.id = card_checklist_items.card_id
      AND bm.user_id = auth.uid()
      AND bm.role IN ('owner', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM cards c
      JOIN lists l ON l.id = c.list_id
      JOIN board_members bm ON bm.board_id = l.board_id
      WHERE c.id = card_checklist_items.card_id
      AND bm.user_id = auth.uid()
      AND bm.role IN ('owner', 'editor')
    )
  );

