-- Create workspace_invitations table
CREATE TABLE IF NOT EXISTS workspace_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id) NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  accepted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(workspace_id, email, accepted)
);

-- Create indexes
CREATE INDEX idx_workspace_invitations_email ON workspace_invitations(email, accepted);
CREATE INDEX idx_workspace_invitations_workspace ON workspace_invitations(workspace_id);
CREATE INDEX idx_workspace_invitations_token ON workspace_invitations(token);

-- Enable RLS
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view invitations sent to them"
  ON workspace_invitations FOR SELECT
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Workspace owners can create invitations"
  ON workspace_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE workspaces.id = workspace_invitations.workspace_id 
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own invitations"
  ON workspace_invitations FOR UPDATE
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Function to accept workspace invitation
CREATE OR REPLACE FUNCTION accept_workspace_invitation(invitation_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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
  
  -- Add user to workspace_members
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (v_invitation.workspace_id, v_user_id, v_invitation.role)
  ON CONFLICT (workspace_id, user_id) DO NOTHING;
  
  -- Mark invitation as accepted
  UPDATE workspace_invitations
  SET accepted = TRUE
  WHERE id = v_invitation.id;
  
  RETURN TRUE;
END;
$$;

-- Enable realtime
ALTER TABLE workspace_invitations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE workspace_invitations;
