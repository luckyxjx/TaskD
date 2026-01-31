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

-- Add function to check if user is board owner
CREATE OR REPLACE FUNCTION is_board_owner(p_board_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_owner BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM board_members
    WHERE board_id = p_board_id
    AND user_id = p_user_id
    AND role = 'owner'
  ) INTO v_is_owner;
  
  RETURN v_is_owner;
END;
$$;

-- Update board_members policies to prevent owner removal/role change
DROP POLICY IF EXISTS "Board members can view other members" ON board_members;
DROP POLICY IF EXISTS "Board owners can manage members" ON board_members;
DROP POLICY IF EXISTS "Board owners can add members" ON board_members;
DROP POLICY IF EXISTS "Board owners can remove members" ON board_members;
DROP POLICY IF EXISTS "Board owners can update member roles" ON board_members;
DROP POLICY IF EXISTS "Members can leave boards" ON board_members;

-- Allow members to view all board members
CREATE POLICY "Board members can view other members"
  ON board_members FOR SELECT
  USING (
    board_id IN (
      SELECT board_id FROM board_members WHERE user_id = auth.uid()
    )
  );

-- Allow board owners to add members
CREATE POLICY "Board owners can add members"
  ON board_members FOR INSERT
  WITH CHECK (
    is_board_owner(board_id, auth.uid())
  );

-- Allow board owners to remove members (but not themselves if they're the owner)
CREATE POLICY "Board owners can remove members"
  ON board_members FOR DELETE
  USING (
    is_board_owner(board_id, auth.uid())
    AND role != 'owner'  -- Cannot delete owner
  );

-- Allow board owners to update member roles (but not owner role)
CREATE POLICY "Board owners can update member roles"
  ON board_members FOR UPDATE
  USING (
    is_board_owner(board_id, auth.uid())
    AND role != 'owner'  -- Cannot update owner role
  )
  WITH CHECK (
    role != 'owner'  -- Cannot change to owner role
  );

-- Allow non-owner members to leave boards
CREATE POLICY "Members can leave boards"
  ON board_members FOR DELETE
  USING (
    user_id = auth.uid()
    AND role != 'owner'  -- Owners cannot leave
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
