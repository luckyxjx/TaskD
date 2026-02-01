-- Add DELETE policy for board_members so non-owners can leave boards
-- This allows members to remove themselves from boards they don't own

-- Drop existing DELETE policy if any
DROP POLICY IF EXISTS "Members can leave boards" ON board_members;
DROP POLICY IF EXISTS "Non-owners can delete own membership" ON board_members;

-- Create DELETE policy: Users can delete their own membership ONLY if they're not the owner
CREATE POLICY "Non-owners can delete own membership"
  ON board_members FOR DELETE
  USING (
    user_id = auth.uid()
    AND role != 'owner'  -- Prevent owners from leaving their own boards
  );

-- Add comment
COMMENT ON POLICY "Non-owners can delete own membership" ON board_members 
IS 'Allows non-owner members to leave boards by deleting their membership. Owners cannot leave their own boards.';
