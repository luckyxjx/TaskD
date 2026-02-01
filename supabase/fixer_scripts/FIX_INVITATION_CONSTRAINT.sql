-- Fix invitation constraint issue
-- This removes duplicate accepted invitations and updates the constraint

-- Step 1: Delete all accepted invitations (they should be in board_members instead)
DELETE FROM board_invitations WHERE accepted = true;
DELETE FROM workspace_invitations WHERE accepted = true;

-- Step 2: Drop the old constraint
ALTER TABLE board_invitations 
DROP CONSTRAINT IF EXISTS unique_board_email_invitation;

-- Step 3: Create unique index that only applies to pending invitations
CREATE UNIQUE INDEX IF NOT EXISTS unique_board_email_pending 
ON board_invitations (board_id, email) 
WHERE (accepted = false);

-- Step 4: Do the same for workspace invitations
ALTER TABLE workspace_invitations 
DROP CONSTRAINT IF EXISTS unique_workspace_email_invitation;

CREATE UNIQUE INDEX IF NOT EXISTS unique_workspace_email_pending 
ON workspace_invitations (workspace_id, email) 
WHERE (accepted = false);

-- Step 5: Update accept_board_invitation function to delete invitation after accepting
CREATE OR REPLACE FUNCTION accept_board_invitation(invitation_token TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation board_invitations;
  v_user_id UUID;
  v_user_email TEXT;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  
  -- Get invitation
  SELECT * INTO v_invitation
  FROM board_invitations
  WHERE token = invitation_token
    AND email = v_user_email
    AND accepted = FALSE
    AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;
  
  -- Check if already a member
  IF EXISTS (
    SELECT 1 FROM board_members 
    WHERE board_id = v_invitation.board_id 
    AND user_id = v_user_id
  ) THEN
    -- Already a member, just delete the invitation
    DELETE FROM board_invitations WHERE id = v_invitation.id;
    RETURN jsonb_build_object('success', true, 'message', 'Already a member');
  END IF;
  
  -- Add user to board_members
  INSERT INTO board_members (board_id, user_id, role, accepted_at)
  VALUES (v_invitation.board_id, v_user_id, v_invitation.role, NOW());
  
  -- DELETE the invitation instead of marking as accepted
  DELETE FROM board_invitations WHERE id = v_invitation.id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Step 6: Update accept_workspace_invitation function similarly
CREATE OR REPLACE FUNCTION accept_workspace_invitation(invitation_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation workspace_invitations;
  v_user_id UUID;
  v_user_email TEXT;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  
  -- Get invitation
  SELECT * INTO v_invitation
  FROM workspace_invitations
  WHERE token = invitation_token
    AND email = v_user_email
    AND accepted = FALSE
    AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;
  
  -- Check if already a member
  IF EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = v_invitation.workspace_id 
    AND user_id = v_user_id
  ) THEN
    -- Already a member, just delete the invitation
    DELETE FROM workspace_invitations WHERE id = v_invitation.id;
    RETURN TRUE;
  END IF;
  
  -- Add user to workspace_members
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (v_invitation.workspace_id, v_user_id, v_invitation.role)
  ON CONFLICT (workspace_id, user_id) DO NOTHING;
  
  -- DELETE the invitation instead of marking as accepted
  DELETE FROM workspace_invitations WHERE id = v_invitation.id;
  
  RETURN TRUE;
END;
$$;

-- Step 7: Clean up any orphaned invitations (older than 30 days)
DELETE FROM board_invitations 
WHERE created_at < NOW() - INTERVAL '30 days';

DELETE FROM workspace_invitations 
WHERE created_at < NOW() - INTERVAL '30 days';
