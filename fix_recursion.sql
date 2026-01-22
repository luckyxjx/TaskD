-- COPY AND PASTE THIS INTO SUPABASE SQL EDITOR
-- This removes the trigger causing infinite recursion

-- Drop the problematic trigger
DROP TRIGGER IF EXISTS trigger_add_board_owner ON boards;
DROP FUNCTION IF EXISTS add_board_owner_as_member();

-- Add helper function for application to use
CREATE OR REPLACE FUNCTION add_user_as_board_owner(board_uuid UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO board_members (board_id, user_id, role, accepted_at)
  VALUES (board_uuid, auth.uid(), 'owner', NOW())
  ON CONFLICT (board_id, user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
