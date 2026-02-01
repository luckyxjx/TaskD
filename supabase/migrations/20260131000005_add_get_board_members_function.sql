-- Add function to get all board members (bypasses RLS)
CREATE OR REPLACE FUNCTION get_board_members(p_board_id UUID)
RETURNS TABLE (
  id UUID,
  board_id UUID,
  user_id UUID,
  role TEXT,
  accepted_at TIMESTAMP,
  email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is a member of this board
  IF NOT EXISTS (
    SELECT 1 FROM board_members
    WHERE board_members.board_id = p_board_id
    AND board_members.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You are not a member of this board';
  END IF;

  -- Return all members with their emails
  RETURN QUERY
  SELECT 
    bm.id,
    bm.board_id,
    bm.user_id,
    bm.role,
    bm.accepted_at,
    COALESCE(au.email::TEXT, 'Unknown'::TEXT) as email
  FROM board_members bm
  LEFT JOIN auth.users au ON au.id = bm.user_id
  WHERE bm.board_id = p_board_id
  ORDER BY 
    CASE bm.role 
      WHEN 'owner' THEN 1
      WHEN 'editor' THEN 2
      WHEN 'viewer' THEN 3
    END,
    bm.accepted_at DESC;
END;
$$;

-- Add function to manage board members (for owners only)
CREATE OR REPLACE FUNCTION manage_board_member_role(
  p_board_id UUID,
  p_member_id UUID,
  p_action TEXT, -- 'update_role' or 'remove'
  p_new_role TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user_role TEXT;
  v_target_member_role TEXT;
BEGIN
  -- Get current user's role
  SELECT role INTO v_current_user_role
  FROM board_members
  WHERE board_id = p_board_id
  AND user_id = auth.uid();

  -- Check if current user is owner
  IF v_current_user_role != 'owner' THEN
    RAISE EXCEPTION 'Only board owners can manage members';
  END IF;

  -- Get target member's role
  SELECT role INTO v_target_member_role
  FROM board_members
  WHERE id = p_member_id
  AND board_id = p_board_id;

  -- Cannot modify owner
  IF v_target_member_role = 'owner' THEN
    RAISE EXCEPTION 'Cannot modify the board owner';
  END IF;

  -- Perform action
  IF p_action = 'update_role' THEN
    IF p_new_role IS NULL OR p_new_role = 'owner' THEN
      RAISE EXCEPTION 'Invalid role';
    END IF;
    
    UPDATE board_members
    SET role = p_new_role
    WHERE id = p_member_id
    AND board_id = p_board_id;
    
  ELSIF p_action = 'remove' THEN
    DELETE FROM board_members
    WHERE id = p_member_id
    AND board_id = p_board_id;
    
  ELSE
    RAISE EXCEPTION 'Invalid action: %', p_action;
  END IF;

  RETURN TRUE;
END;
$$;
