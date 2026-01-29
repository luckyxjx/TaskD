-- CRITICAL FIX: Remove infinite recursion from board_members policy
-- Error: "infinite recursion detected in policy for relation board_members"

-- The problem: board_members policy was checking board_members table
-- This creates infinite loop: board_members → board_members → board_members...

-- Drop ALL existing board_members policies
DROP POLICY IF EXISTS "Users can view board members" ON board_members;
DROP POLICY IF EXISTS "Workspace owners can manage members" ON board_members;

-- Create NON-RECURSIVE policy for SELECT
CREATE POLICY "Users can view board members"
  ON board_members FOR SELECT
  USING (
    -- Users can ALWAYS see their own memberships (no recursion)
    user_id = auth.uid()
    OR
    -- Workspace owners can see members of boards in their workspaces
    board_id IN (
      SELECT b.id FROM boards b
      JOIN workspaces w ON b.workspace_id = w.id
      WHERE w.owner_id = auth.uid()
    )
    -- REMOVED: The recursive check that was causing the error
    -- OR board_id IN (SELECT board_id FROM board_members WHERE user_id = auth.uid())
  );

-- Create policy for INSERT/UPDATE/DELETE (workspace owners only)
CREATE POLICY "Workspace owners can manage members"
  ON board_members FOR ALL
  USING (
    board_id IN (
      SELECT b.id FROM boards b
      JOIN workspaces w ON b.workspace_id = w.id
      WHERE w.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    board_id IN (
      SELECT b.id FROM boards b
      JOIN workspaces w ON b.workspace_id = w.id
      WHERE w.owner_id = auth.uid()
    )
  );

-- Add comments
COMMENT ON POLICY "Users can view board members" ON board_members 
IS 'Non-recursive: users see own memberships + workspace owners see their board members';

COMMENT ON POLICY "Workspace owners can manage members" ON board_members 
IS 'Only workspace owners can add/remove/update board members';
