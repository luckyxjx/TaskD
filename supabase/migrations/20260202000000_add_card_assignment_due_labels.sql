-- Add visible task-management metadata used by board filters and dashboard analytics.
ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS label text;

CREATE INDEX IF NOT EXISTS idx_cards_assignee_id ON cards(assignee_id);
CREATE INDEX IF NOT EXISTS idx_cards_due_date ON cards(due_date);
CREATE INDEX IF NOT EXISTS idx_cards_label ON cards(label);

