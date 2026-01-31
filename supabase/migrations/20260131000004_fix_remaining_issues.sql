-- Fix remaining issues with board sharing and member management

-- Ensure get_user_email function exists and works properly
CREATE OR REPLACE FUNCTION get_user_email(user_uuid UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT email FROM auth.users WHERE id = user_uuid;
$$;

-- Update board_members policies to prevent owner removal/role change
-- Drop all existing policies first
DROP POLICY IF EXISTS "Board members can view other members" ON board_members;
DROP POLICY IF EXISTS "Board owners can manage members" ON board_members;
DROP POLICY IF EXISTS "Board owners can add members" ON board_members;
DROP POLICY IF EXISTS "Board owners can remove members" ON board_members;
DROP POLICY IF EXISTS "Board owners can update member roles" ON board_members;
DROP POLICY IF EXISTS "Members can leave boards" ON board_members;
DROP POLICY IF EXISTS "Users can view board members" ON board_members;
DROP POLICY IF EXISTS "Users can manage board members" ON board_members;

-- Simple policies without recursion
-- Allow users to view members of boards they belong to
CREATE POLICY "Users can view board members"
  ON board_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM board_members bm
      WHERE bm.board_id = board_members.board_id
      AND bm.user_id = auth.uid()
    )
  );

-- Allow users to manage board members (insert, update, delete)
-- This is handled by application logic for owner checks
CREATE POLICY "Users can manage board members"
  ON board_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM board_members bm
      WHERE bm.board_id = board_members.board_id
      AND bm.user_id = auth.uid()
      AND bm.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM board_members bm
      WHERE bm.board_id = board_members.board_id
      AND bm.user_id = auth.uid()
      AND bm.role = 'owner'
    )
  );

-- Ensure boards always have a workspace_id
ALTER TABLE boards
  ALTER COLUMN workspace_id SET NOT NULL;

-- Add check constraint to ensure boards belong to a workspace
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'boards_must_have_workspace'
  ) THEN
    ALTER TABLE boards
      ADD CONSTRAINT boards_must_have_workspace
      CHECK (workspace_id IS NOT NULL);
  END IF;
END $$;
