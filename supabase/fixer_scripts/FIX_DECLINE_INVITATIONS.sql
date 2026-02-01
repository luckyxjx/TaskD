-- URGENT FIX: Allow users to delete (decline) their invitations
-- Run this in Supabase Dashboard SQL Editor NOW

-- Add DELETE policy for board_invitations
DROP POLICY IF EXISTS "Users can delete their own invitations" ON board_invitations;

CREATE POLICY "Users can delete their own invitations"
  ON board_invitations FOR DELETE
  USING (
    email = auth.jwt() ->> 'email'
  );

-- Add DELETE policy for workspace_invitations
DROP POLICY IF EXISTS "Users can delete their invitations" ON workspace_invitations;

CREATE POLICY "Users can delete their invitations"
  ON workspace_invitations FOR DELETE
  USING (
    email = auth.jwt() ->> 'email'
  );

-- Verify policies were created
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd 
FROM pg_policies 
WHERE tablename IN ('board_invitations', 'workspace_invitations')
  AND cmd = 'DELETE'
ORDER BY tablename, policyname;
