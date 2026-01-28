-- Improve accept_board_invitation function to ensure board_members entry is created
-- and return more detailed information for debugging

CREATE OR REPLACE FUNCTION accept_board_invitation(invitation_token TEXT)
RETURNS JSONB AS $$
DECLARE
  invitation RECORD;
  member_id UUID;
  member_exists BOOLEAN;
BEGIN
  -- Find invitation
  SELECT * INTO invitation
  FROM board_invitations
  WHERE token = invitation_token
    AND NOT accepted
    AND expires_at > NOW()
    AND email = (SELECT email FROM auth.users WHERE id = auth.uid());
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Invalid or expired invitation',
      'debug', jsonb_build_object(
        'token', invitation_token,
        'user_email', (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    );
  END IF;
  
  -- Check if member already exists
  SELECT EXISTS(
    SELECT 1 FROM board_members 
    WHERE board_id = invitation.board_id 
    AND user_id = auth.uid()
  ) INTO member_exists;
  
  -- Insert or update board member
  INSERT INTO board_members (board_id, user_id, role, invited_by, accepted_at)
  VALUES (invitation.board_id, auth.uid(), invitation.role, invitation.invited_by, NOW())
  ON CONFLICT (board_id, user_id) DO UPDATE
    SET role = EXCLUDED.role,
        invited_by = EXCLUDED.invited_by,
        accepted_at = EXCLUDED.accepted_at
  RETURNING id INTO member_id;
  
  -- Update invitation
  UPDATE board_invitations
  SET accepted = true, accepted_by = auth.uid(), accepted_at = NOW()
  WHERE id = invitation.id;
  
  -- Log activity
  INSERT INTO activities (board_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (
    invitation.board_id,
    auth.uid(),
    'joined',
    'member',
    auth.uid(),
    jsonb_build_object('role', invitation.role)
  );
  
  -- Return detailed success response
  RETURN jsonb_build_object(
    'success', true, 
    'board_id', invitation.board_id,
    'member_id', member_id,
    'role', invitation.role,
    'was_existing_member', member_exists,
    'debug', jsonb_build_object(
      'user_id', auth.uid(),
      'invitation_id', invitation.id
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION accept_board_invitation IS 'Accepts board invitation and creates/updates board_members entry with detailed response';
