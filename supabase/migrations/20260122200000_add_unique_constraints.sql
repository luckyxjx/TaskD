-- Add unique constraints to prevent duplicate names

-- ============================================
-- 1. UNIQUE WORKSPACE NAMES PER USER
-- ============================================

-- Drop existing constraint if any
ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS unique_workspace_name_per_user;

-- Add unique constraint (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS unique_workspace_name_per_user 
ON workspaces (owner_id, LOWER(name));

-- ============================================
-- 2. UNIQUE BOARD NAMES PER WORKSPACE
-- ============================================

-- Drop existing constraint if any
ALTER TABLE boards DROP CONSTRAINT IF EXISTS unique_board_name_per_workspace;

-- Add unique constraint (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS unique_board_name_per_workspace 
ON boards (workspace_id, LOWER(name));

-- ============================================
-- 3. UNIQUE CARD TITLES PER LIST
-- ============================================

-- Drop existing constraint if any
ALTER TABLE cards DROP CONSTRAINT IF EXISTS unique_card_title_per_list;

-- Add unique constraint (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS unique_card_title_per_list 
ON cards (list_id, LOWER(title));

-- ============================================
-- DONE! Database will now enforce uniqueness
-- ============================================

COMMENT ON INDEX unique_workspace_name_per_user IS 'Prevents duplicate workspace names for same user (case-insensitive)';
COMMENT ON INDEX unique_board_name_per_workspace IS 'Prevents duplicate board names in same workspace (case-insensitive)';
COMMENT ON INDEX unique_card_title_per_list IS 'Prevents duplicate card titles in same list (case-insensitive)';
