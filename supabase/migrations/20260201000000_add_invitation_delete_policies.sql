-- Add DELETE policies for invitations so users can decline them
-- This fixes the issue where declined invitations stay in the database

-- Add DELETE policy for board_invitations
DROP POLICY IF EXISTS "Users can delete their own invitations" ON board_invitations;

CREATE POLICY "Users can delete their own invitations"
  ON board_invitations FOR DELETE
  USING (
    email = auth.jwt() ->> 'email'
  );

-- Add DELETE policy for workspace_invitations (if not already exists)
DROP POLICY IF EXISTS "Users can delete their invitations" ON workspace_invitations;

CREATE POLICY "Users can delete their invitations"
  ON workspace_invitations FOR DELETE
  USING (
    email = auth.jwt() ->> 'email'
  );

-- Add comment
COMMENT ON POLICY "Users can delete their own invitations" ON board_invitations 
IS 'Allows users to decline invitations sent to their email';

COMMENT ON POLICY "Users can delete their invitations" ON workspace_invitations 
IS 'Allows users to decline invitations sent to their email';
