-- Add priority field to cards table
ALTER TABLE cards ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- Create index for priority filtering
CREATE INDEX IF NOT EXISTS idx_cards_priority ON cards(priority);
