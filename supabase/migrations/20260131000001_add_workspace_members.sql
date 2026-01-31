-- Create workspace_members table
CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('owner', 'admin', 'member')) DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Create indexes
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);

-- Enable RLS
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workspace_members
-- Simple policy: users can see their own memberships
CREATE POLICY "Users can view their own workspace memberships"
  ON workspace_members FOR SELECT
  USING (user_id = auth.uid());

-- Workspace owners can add members (check ownership via workspaces table)
CREATE POLICY "Workspace owners can add members"
  ON workspace_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE workspaces.id = workspace_members.workspace_id 
      AND workspaces.owner_id = auth.uid()
    )
  );

-- Workspace owners can remove members (check ownership via workspaces table)
CREATE POLICY "Workspace owners can remove members"
  ON workspace_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE workspaces.id = workspace_members.workspace_id 
      AND workspaces.owner_id = auth.uid()
    )
  );

-- Migrate existing workspaces: add owners as members
INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT id, owner_id, 'owner'
FROM workspaces
WHERE owner_id IS NOT NULL
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- Enable realtime
ALTER TABLE workspace_members REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE workspace_members;
