-- Fix board_members RLS policy to remove recursion
-- This fixes the issue where shared boards disappear after reload

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Users can view board members" ON board_members;

-- Create a non-recursive policy
CREATE POLICY "Users can view board members"
  ON board_members FOR SELECT
  USING (
    -- Users can always see their own memberships (NO RECURSION)
    user_id = auth.uid()
    OR
    -- Workspace owners can see all members of boards in their workspaces
    board_id IN (
      SELECT b.id FROM boards b
      JOIN workspaces w ON b.workspace_id = w.id
      WHERE w.owner_id = auth.uid()
    )
  );

-- Add comment explaining the fix
COMMENT ON POLICY "Users can view board members" ON board_members 
IS 'Non-recursive policy: users see own memberships + workspace owners see their board members';
