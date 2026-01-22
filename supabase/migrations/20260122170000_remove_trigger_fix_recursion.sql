-- FINAL FIX: Remove trigger that causes infinite recursion
-- Instead, we'll add board owner manually in application code

-- ============================================
-- 1. DROP THE PROBLEMATIC TRIGGER
-- ============================================

DROP TRIGGER IF EXISTS trigger_add_board_owner ON boards;
DROP FUNCTION IF EXISTS add_board_owner_as_member();

-- ============================================
-- 2. KEEP SIMPLE BOARD_MEMBERS POLICIES (from previous fix)
-- ============================================

-- These policies are already correct from 20260122160000_complete_fix.sql
-- They don't cause recursion because they check workspace ownership directly

-- ============================================
-- 3. ADD HELPER FUNCTION FOR APPLICATION TO USE
-- ============================================

-- Function to add board owner after board creation
-- This will be called from the application code, not as a trigger
CREATE OR REPLACE FUNCTION add_user_as_board_owner(board_uuid UUID)
RETURNS void AS $$
BEGIN
  -- Add current user as board owner
  INSERT INTO board_members (board_id, user_id, role, accepted_at)
  VALUES (board_uuid, auth.uid(), 'owner', NOW())
  ON CONFLICT (board_id, user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DONE! 🎉
-- ============================================

COMMENT ON FUNCTION add_user_as_board_owner IS 'Manually add user as board owner - call from application after creating board';
