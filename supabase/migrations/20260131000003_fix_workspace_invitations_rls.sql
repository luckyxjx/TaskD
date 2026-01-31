-- Fix workspace_invitations RLS policies to avoid auth.users table access

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view invitations sent to them" ON workspace_invitations;
DROP POLICY IF EXISTS "Users can view invitations sent to their email" ON workspace_invitations;
DROP POLICY IF EXISTS "Users can view their invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Users can update their own invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Users can update invitations sent to their email" ON workspace_invitations;
DROP POLICY IF EXISTS "Anyone can update invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Workspace owners can create invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Users can delete their invitations" ON workspace_invitations;

-- Helper function to get current user's email
CREATE OR REPLACE FUNCTION get_current_user_email()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = auth.uid();
  
  RETURN user_email;
END;
$$;

-- Create new policies without direct auth.users table access

-- Allow users to view invitations sent to their email
CREATE POLICY "Users can view their invitations"
  ON workspace_invitations FOR SELECT
  USING (
    email = get_current_user_email()
    OR invited_by = auth.uid()
  );

-- Allow workspace owners to create invitations
CREATE POLICY "Workspace owners can create invitations"
  ON workspace_invitations FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Allow anyone to update invitations (needed for accepting)
CREATE POLICY "Anyone can update invitations"
  ON workspace_invitations FOR UPDATE
  USING (true);

-- Allow users to delete their own invitations
CREATE POLICY "Users can delete their invitations"
  ON workspace_invitations FOR DELETE
  USING (email = get_current_user_email());
