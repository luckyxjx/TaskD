-- Final fix for infinite recursion
-- The issue: The trigger adds owner to board_members, but the INSERT policy checks board_members

-- ============================================
-- 1. FIX THE TRIGGER FUNCTION (Use SECURITY DEFINER to bypass RLS)
-- ============================================

DROP TRIGGER IF EXISTS trigger_add_board_owner ON boards;
DROP FUNCTION IF EXISTS add_board_owner_as_member();

-- This function runs with elevated privileges, bypassing RLS
CREATE OR REPLACE FUNCTION add_board_owner_as_member()
RETURNS TRIGGER
SECURITY DEFINER -- This is the key! Bypasses RLS
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  workspace_owner_id UUID;
BEGIN
  -- Get the workspace owner
  SELECT owner_id INTO workspace_owner_id
  FROM workspaces
  WHERE id = NEW.workspace_id;
  
  -- Add workspace owner as board owner (bypasses RLS because of SECURITY DEFINER)
  IF workspace_owner_id IS NOT NULL THEN
    INSERT INTO board_members (board_id, user_id, role, accepted_at)
    VALUES (NEW.id, workspace_owner_id, 'owner', NOW())
    ON CONFLICT (board_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_add_board_owner
  AFTER INSERT ON boards
  FOR EACH ROW
  EXECUTE FUNCTION add_board_owner_as_member();

-- ============================================
-- 2. SIMPLIFY BOARD_MEMBERS INSERT POLICY
-- ============================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "Board owners can insert members" ON board_members;

-- New policy: Allow insert if user is owner OR if it's the trigger (SECURITY DEFINER)
CREATE POLICY "Board owners can insert members"
  ON board_members FOR INSERT
  WITH CHECK (
    -- Allow if user is already an owner of this board
    EXISTS (
      SELECT 1 FROM board_members bm
      WHERE bm.board_id = board_members.board_id
        AND bm.user_id = auth.uid()
        AND bm.role = 'owner'
    )
    OR
    -- Allow if inserting self as owner (for trigger)
    (user_id = auth.uid() AND role = 'owner')
    OR
    -- Allow if workspace owner (for trigger)
    board_id IN (
      SELECT b.id FROM boards b
      JOIN workspaces w ON b.workspace_id = w.id
      WHERE w.owner_id = auth.uid()
    )
  );

-- ============================================
-- DONE! 🎉
-- ============================================

COMMENT ON FUNCTION add_board_owner_as_member() IS 'SECURITY DEFINER function to bypass RLS when adding board owner';
