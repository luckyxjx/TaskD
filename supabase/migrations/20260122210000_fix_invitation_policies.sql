-- Fix board_invitations RLS policies to avoid direct auth.users access
-- This fixes the "permission denied for table users" error

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view invitations sent to them" ON board_invitations;
DROP POLICY IF EXISTS "Users can update their own invitations" ON board_invitations;

-- Recreate policies using auth.jwt() instead of querying auth.users
CREATE POLICY "Users can view invitations sent to them"
  ON board_invitations FOR SELECT
  USING (
    email = auth.jwt() ->> 'email'
  );

CREATE POLICY "Users can update their own invitations"
  ON board_invitations FOR UPDATE
  USING (
    email = auth.jwt() ->> 'email'
  );

-- Add comment explaining the fix
COMMENT ON POLICY "Users can view invitations sent to them" ON board_invitations 
IS 'Uses auth.jwt() to avoid querying auth.users table directly, preventing RLS permission errors';
