-- Add unique constraints to prevent duplicate names
-- First clean up existing duplicates, then add constraints

-- ============================================
-- 1. CLEAN UP DUPLICATE WORKSPACES
-- ============================================

-- Keep only the oldest workspace for each duplicate name (by created_at)
DELETE FROM workspaces
WHERE id IN (
  SELECT w1.id
  FROM workspaces w1
  INNER JOIN workspaces w2 ON 
    w1.owner_id = w2.owner_id 
    AND LOWER(w1.name) = LOWER(w2.name)
    AND w1.created_at > w2.created_at
);

-- Add unique constraint (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS unique_workspace_name_per_user 
ON workspaces (owner_id, LOWER(name));

-- ============================================
-- 2. CLEAN UP DUPLICATE BOARDS
-- ============================================

-- Keep only the oldest board for each duplicate name (by created_at)
DELETE FROM boards
WHERE id IN (
  SELECT b1.id
  FROM boards b1
  INNER JOIN boards b2 ON 
    b1.workspace_id = b2.workspace_id 
    AND LOWER(b1.name) = LOWER(b2.name)
    AND b1.created_at > b2.created_at
);

-- Add unique constraint (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS unique_board_name_per_workspace 
ON boards (workspace_id, LOWER(name));

-- ============================================
-- 3. CLEAN UP DUPLICATE CARDS
-- ============================================

-- Keep only the oldest card for each duplicate title (by created_at)
DELETE FROM cards
WHERE id IN (
  SELECT c1.id
  FROM cards c1
  INNER JOIN cards c2 ON 
    c1.list_id = c2.list_id 
    AND LOWER(c1.title) = LOWER(c2.title)
    AND c1.created_at > c2.created_at
);

-- Add unique constraint (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS unique_card_title_per_list 
ON cards (list_id, LOWER(title));

-- ============================================
-- DONE! Duplicates removed and constraints added
-- ============================================

COMMENT ON INDEX unique_workspace_name_per_user IS 'Prevents duplicate workspace names for same user (case-insensitive)';
COMMENT ON INDEX unique_board_name_per_workspace IS 'Prevents duplicate board names in same workspace (case-insensitive)';
COMMENT ON INDEX unique_card_title_per_list IS 'Prevents duplicate card titles in same list (case-insensitive)';
