-- Phase 1: Collaboration Features Migration
-- This adds board sharing, invitations, activity log, and comments

-- ============================================
-- 1. BOARD MEMBERS (Multi-user collaboration)
-- ============================================

CREATE TABLE IF NOT EXISTS board_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(board_id, user_id)
);

CREATE INDEX idx_board_members_board ON board_members(board_id);
CREATE INDEX idx_board_members_user ON board_members(user_id);

-- Add board owner as member automatically (get owner from workspace)
CREATE OR REPLACE FUNCTION add_board_owner_as_member()
RETURNS TRIGGER AS $$
DECLARE
  workspace_owner_id UUID;
BEGIN
  -- Get the workspace owner
  SELECT owner_id INTO workspace_owner_id
  FROM workspaces
  WHERE id = NEW.workspace_id;
  
  -- Add workspace owner as board owner
  IF workspace_owner_id IS NOT NULL THEN
    INSERT INTO board_members (board_id, user_id, role, accepted_at)
    VALUES (NEW.id, workspace_owner_id, 'owner', NOW())
    ON CONFLICT (board_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_add_board_owner
  AFTER INSERT ON boards
  FOR EACH ROW
  EXECUTE FUNCTION add_board_owner_as_member();

-- ============================================
-- 2. BOARD INVITATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS board_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('editor', 'viewer')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted BOOLEAN DEFAULT FALSE,
  accepted_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_invitations_board ON board_invitations(board_id);
CREATE INDEX idx_invitations_email ON board_invitations(email);
CREATE INDEX idx_invitations_token ON board_invitations(token);

-- ============================================
-- 3. ACTIVITY LOG
-- ============================================

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'created', 'updated', 'moved', 'deleted', 'commented', 'invited', 'joined'
  entity_type TEXT NOT NULL, -- 'card', 'list', 'board', 'comment', 'member'
  entity_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}', -- Store details like old/new values, card title, etc.
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activities_board ON activities(board_id, created_at DESC);
CREATE INDEX idx_activities_user ON activities(user_id);

-- ============================================
-- 4. CARD COMMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS card_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}', -- Array of mentioned user IDs
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_comments_card ON card_comments(card_id, created_at DESC);
CREATE INDEX idx_comments_user ON card_comments(user_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_comment_timestamp
  BEFORE UPDATE ON card_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_comments ENABLE ROW LEVEL SECURITY;

-- Board Members Policies
CREATE POLICY "Users can view board members of their boards"
  ON board_members FOR SELECT
  USING (
    board_id IN (
      SELECT board_id FROM board_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Board owners can manage members"
  ON board_members FOR ALL
  USING (
    board_id IN (
      SELECT board_id FROM board_members 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Board Invitations Policies
CREATE POLICY "Users can view invitations they sent"
  ON board_invitations FOR SELECT
  USING (invited_by = auth.uid());

CREATE POLICY "Users can view invitations sent to them"
  ON board_invitations FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Board owners can create invitations"
  ON board_invitations FOR INSERT
  WITH CHECK (
    board_id IN (
      SELECT board_id FROM board_members 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Users can update their own invitations"
  ON board_invitations FOR UPDATE
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Activities Policies
CREATE POLICY "Users can view activities of their boards"
  ON activities FOR SELECT
  USING (
    board_id IN (
      SELECT board_id FROM board_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create activities on their boards"
  ON activities FOR INSERT
  WITH CHECK (
    board_id IN (
      SELECT board_id FROM board_members WHERE user_id = auth.uid()
    )
  );

-- Comments Policies
CREATE POLICY "Users can view comments on accessible cards"
  ON card_comments FOR SELECT
  USING (
    card_id IN (
      SELECT c.id FROM cards c
      JOIN lists l ON c.list_id = l.id
      JOIN board_members bm ON l.board_id = bm.board_id
      WHERE bm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create comments on accessible cards"
  ON card_comments FOR INSERT
  WITH CHECK (
    card_id IN (
      SELECT c.id FROM cards c
      JOIN lists l ON c.list_id = l.id
      JOIN board_members bm ON l.board_id = bm.board_id
      WHERE bm.user_id = auth.uid() AND bm.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Users can update their own comments"
  ON card_comments FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON card_comments FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- 6. UPDATE EXISTING BOARDS RLS
-- ============================================

-- Update boards policies to check board_members instead of owner_id
DROP POLICY IF EXISTS "Users can view their own boards" ON boards;
DROP POLICY IF EXISTS "Users can create boards" ON boards;
DROP POLICY IF EXISTS "Users can update their own boards" ON boards;
DROP POLICY IF EXISTS "Users can delete their own boards" ON boards;

CREATE POLICY "Users can view boards they are members of"
  ON boards FOR SELECT
  USING (
    id IN (
      SELECT board_id FROM board_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create boards"
  ON boards FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Board owners can update boards"
  ON boards FOR UPDATE
  USING (
    id IN (
      SELECT board_id FROM board_members 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Board owners can delete boards"
  ON boards FOR DELETE
  USING (
    id IN (
      SELECT board_id FROM board_members 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================
-- 7. UPDATE LISTS RLS
-- ============================================

DROP POLICY IF EXISTS "Users can view lists in their boards" ON lists;
DROP POLICY IF EXISTS "Users can create lists in their boards" ON lists;
DROP POLICY IF EXISTS "Users can update lists in their boards" ON lists;
DROP POLICY IF EXISTS "Users can delete lists in their boards" ON lists;

CREATE POLICY "Users can view lists in accessible boards"
  ON lists FOR SELECT
  USING (
    board_id IN (
      SELECT board_id FROM board_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can create lists"
  ON lists FOR INSERT
  WITH CHECK (
    board_id IN (
      SELECT board_id FROM board_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Editors can update lists"
  ON lists FOR UPDATE
  USING (
    board_id IN (
      SELECT board_id FROM board_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Editors can delete lists"
  ON lists FOR DELETE
  USING (
    board_id IN (
      SELECT board_id FROM board_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- ============================================
-- 8. UPDATE CARDS RLS
-- ============================================

DROP POLICY IF EXISTS "Users can view cards in their boards" ON cards;
DROP POLICY IF EXISTS "Users can create cards in their boards" ON cards;
DROP POLICY IF EXISTS "Users can update cards in their boards" ON cards;
DROP POLICY IF EXISTS "Users can delete cards in their boards" ON cards;

CREATE POLICY "Users can view cards in accessible boards"
  ON cards FOR SELECT
  USING (
    list_id IN (
      SELECT l.id FROM lists l
      JOIN board_members bm ON l.board_id = bm.board_id
      WHERE bm.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can create cards"
  ON cards FOR INSERT
  WITH CHECK (
    list_id IN (
      SELECT l.id FROM lists l
      JOIN board_members bm ON l.board_id = bm.board_id
      WHERE bm.user_id = auth.uid() AND bm.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Editors can update cards"
  ON cards FOR UPDATE
  USING (
    list_id IN (
      SELECT l.id FROM lists l
      JOIN board_members bm ON l.board_id = bm.board_id
      WHERE bm.user_id = auth.uid() AND bm.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Editors can delete cards"
  ON cards FOR DELETE
  USING (
    list_id IN (
      SELECT l.id FROM lists l
      JOIN board_members bm ON l.board_id = bm.board_id
      WHERE bm.user_id = auth.uid() AND bm.role IN ('owner', 'editor')
    )
  );

-- ============================================
-- 9. HELPER FUNCTIONS
-- ============================================

-- Function to get user email by ID (for displaying member info)
CREATE OR REPLACE FUNCTION get_user_email(user_uuid UUID)
RETURNS TEXT AS $$
  SELECT email FROM auth.users WHERE id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function to accept invitation
CREATE OR REPLACE FUNCTION accept_board_invitation(invitation_token TEXT)
RETURNS JSONB AS $$
DECLARE
  invitation RECORD;
  result JSONB;
BEGIN
  -- Get invitation
  SELECT * INTO invitation
  FROM board_invitations
  WHERE token = invitation_token
    AND NOT accepted
    AND expires_at > NOW()
    AND email = (SELECT email FROM auth.users WHERE id = auth.uid());
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;
  
  -- Add user as board member
  INSERT INTO board_members (board_id, user_id, role, invited_by, accepted_at)
  VALUES (invitation.board_id, auth.uid(), invitation.role, invitation.invited_by, NOW())
  ON CONFLICT (board_id, user_id) DO NOTHING;
  
  -- Mark invitation as accepted
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
  
  RETURN jsonb_build_object('success', true, 'board_id', invitation.board_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. MIGRATE EXISTING BOARDS
-- ============================================

-- Add existing board owners as members (through workspace ownership)
INSERT INTO board_members (board_id, user_id, role, accepted_at)
SELECT b.id, w.owner_id, 'owner', NOW()
FROM boards b
JOIN workspaces w ON b.workspace_id = w.id
WHERE w.owner_id IS NOT NULL
ON CONFLICT (board_id, user_id) DO NOTHING;

-- ============================================
-- DONE! 🎉
-- ============================================

COMMENT ON TABLE board_members IS 'Stores board membership and roles for collaboration';
COMMENT ON TABLE board_invitations IS 'Stores pending board invitations';
COMMENT ON TABLE activities IS 'Stores activity log for boards';
COMMENT ON TABLE card_comments IS 'Stores comments on cards with mentions support';
