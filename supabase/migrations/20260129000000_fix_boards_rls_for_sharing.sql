-- Fix boards RLS to allow board_members to view shared boards
-- This is the CRITICAL fix for shared boards disappearing

-- The current policy ONLY allows workspace owners to see boards
-- We need to add a policy that allows board_members to VIEW boards

-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "Workspace owners manage boards" ON boards;

-- Create separate policies for different operations

-- 1. SELECT: Workspace owners OR board members can view
CREATE POLICY "Users can view boards"
  ON boards FOR SELECT
  USING (
    -- Workspace owners can see all their boards
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
    OR
    -- Board members can see shared boards
    id IN (
      SELECT board_id FROM board_members WHERE user_id = auth.uid()
    )
  );

-- 2. INSERT: Only workspace owners can create boards
CREATE POLICY "Workspace owners can create boards"
  ON boards FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- 3. UPDATE: Workspace owners OR board members with editor/owner role
CREATE POLICY "Users can update boards"
  ON boards FOR UPDATE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
    OR
    id IN (
      SELECT board_id FROM board_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'editor')
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
    OR
    id IN (
      SELECT board_id FROM board_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'editor')
    )
  );

-- 4. DELETE: Only workspace owners can delete boards
CREATE POLICY "Workspace owners can delete boards"
  ON boards FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Add helpful comments
COMMENT ON POLICY "Users can view boards" ON boards 
IS 'Allows workspace owners and board_members to view boards - CRITICAL for sharing';

COMMENT ON POLICY "Workspace owners can create boards" ON boards 
IS 'Only workspace owners can create new boards';

COMMENT ON POLICY "Users can update boards" ON boards 
IS 'Workspace owners and board members with editor/owner role can update boards';

COMMENT ON POLICY "Workspace owners can delete boards" ON boards 
IS 'Only workspace owners can delete boards';
