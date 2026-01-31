-- Add helper function to get user ID by email
CREATE OR REPLACE FUNCTION get_user_by_email(user_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_uuid UUID;
BEGIN
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = user_email
  LIMIT 1;
  
  RETURN user_uuid;
END;
$$;

-- Clean up duplicate invitations (keep only the most recent one)
DELETE FROM board_invitations a
USING board_invitations b
WHERE a.id < b.id
  AND a.board_id = b.board_id
  AND a.email = b.email
  AND a.accepted = b.accepted;

-- Add unique constraint to prevent duplicate invitations
ALTER TABLE board_invitations 
DROP CONSTRAINT IF EXISTS unique_board_email_invitation;

ALTER TABLE board_invitations 
ADD CONSTRAINT unique_board_email_invitation 
UNIQUE (board_id, email, accepted);

-- Create index for faster invitation lookups
CREATE INDEX IF NOT EXISTS idx_board_invitations_email_accepted 
ON board_invitations(email, accepted);
