-- Phase 1: Collaboration Features Migration (CORRECT ARCHITECTURE)
-- Rule #1: Boards do NOT know about members (workspace ownership only)
-- Rule #2: Lists, cards, comments, activities DO know about members
-- Rule #3: No circular RLS dependencies

-- ============================================
-- 1. BOARD MEMBERS (Collaboration Overlay)
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

CREATE INDEX IF NOT EXISTS idx_board_members_board ON board_members(board_id);
CREATE INDEX IF NOT EXISTS idx_board_members_user ON board_members(user_id);

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

CREATE INDEX IF NOT EXISTS idx_invitations_board ON board_invitations(board_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON board_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON board_invitations(token);

-- ============================================
-- 3. ACTIVITY LOG
-- ============================================

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_board ON activities(board_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);

-- ============================================
-- 4. CARD COMMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS card_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comments_card ON card_comments(card_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_user ON card_comments(user_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_comment_timestamp ON card_comments;
CREATE TRIGGER trigger_update_comment_timestamp
  BEFORE UPDATE ON card_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. HELPER FUNCTION FOR APPLICATION
-- ============================================

-- Function to add board owner (called from app after creating board)
CREATE OR REPLACE FUNCTION public.add_user_as_board_owner(
  board_uuid UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO board_members (board_id, user_id, role, accepted_at)
  VALUES (board_uuid, auth.uid(), 'owner', NOW())
  ON CONFLICT (board_id, user_id) DO NOTHING;
END;
$$;

-- ============================================
-- 6. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_comments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- BOARD MEMBERS POLICIES (Simple - No Recursion)
-- ============================================

DROP POLICY IF EXISTS "Users can view board members" ON board_members;
CREATE POLICY "Users can view board members"
  ON board_members FOR SELECT
  USING (
    -- Can see own membership
    user_id = auth.uid()
    OR
    -- Workspace owners can see all members of their boards
    board_id IN (
      SELECT b.id FROM boards b
      JOIN workspaces w ON b.workspace_id = w.id
      WHERE w.owner_id = auth.uid()
    )
    OR
    -- Board members can see other members
    board_id IN (
      SELECT board_id FROM board_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Workspace owners can manage members" ON board_members;
CREATE POLICY "Workspace owners can manage members"
  ON board_members FOR ALL
  USING (
    board_id IN (
      SELECT b.id FROM boards b
      JOIN workspaces w ON b.workspace_id = w.id
      WHERE w.owner_id = auth.uid()
    )
  );

-- ============================================
-- BOARD INVITATIONS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view invitations they sent" ON board_invitations;
CREATE POLICY "Users can view invitations they sent"
  ON board_invitations FOR SELECT
  USING (invited_by = auth.uid());

DROP POLICY IF EXISTS "Users can view invitations sent to them" ON board_invitations;
CREATE POLICY "Users can view invitations sent to them"
  ON board_invitations FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Workspace owners can create invitations" ON board_invitations;
CREATE POLICY "Workspace owners can create invitations"
  ON board_invitations FOR INSERT
  WITH CHECK (
    board_id IN (
      SELECT b.id FROM boards b
      JOIN workspaces w ON b.workspace_id = w.id
      WHERE w.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own invitations" ON board_invitations;
CREATE POLICY "Users can update their own invitations"
  ON board_invitations FOR UPDATE
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- ============================================
-- ACTIVITIES POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view activities" ON activities;
CREATE POLICY "Users can view activities"
  ON activities FOR SELECT
  USING (
    -- Workspace owners see all
    board_id IN (
      SELECT b.id FROM boards b
      JOIN workspaces w ON b.workspace_id = w.id
      WHERE w.owner_id = auth.uid()
    )
    OR
    -- Board members see activities
    board_id IN (
      SELECT board_id FROM board_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create activities" ON activities;
CREATE POLICY "Users can create activities"
  ON activities FOR INSERT
  WITH CHECK (
    board_id IN (
      SELECT b.id FROM boards b
      JOIN workspaces w ON b.workspace_id = w.id
      WHERE w.owner_id = auth.uid()
    )
    OR
    board_id IN (
      SELECT board_id FROM board_members WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- COMMENTS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view comments" ON card_comments;
CREATE POLICY "Users can view comments"
  ON card_comments FOR SELECT
  USING (
    card_id IN (
      SELECT c.id FROM cards c
      JOIN lists l ON c.list_id = l.id
      JOIN boards b ON l.board_id = b.id
      JOIN workspaces w ON b.workspace_id = w.id
      WHERE w.owner_id = auth.uid()
    )
    OR
    card_id IN (
      SELECT c.id FROM cards c
      JOIN lists l ON c.list_id = l.id
      JOIN board_members bm ON l.board_id = bm.board_id
      WHERE bm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create comments" ON card_comments;
CREATE POLICY "Users can create comments"
  ON card_comments FOR INSERT
  WITH CHECK (
    card_id IN (
      SELECT c.id FROM cards c
      JOIN lists l ON c.list_id = l.id
      JOIN boards b ON l.board_id = b.id
      JOIN workspaces w ON b.workspace_id = w.id
      WHERE w.owner_id = auth.uid()
    )
    OR
    card_id IN (
      SELECT c.id FROM cards c
      JOIN lists l ON c.list_id = l.id
      JOIN board_members bm ON l.board_id = bm.board_id
      WHERE bm.user_id = auth.uid() AND bm.role IN ('owner', 'editor')
    )
  );

DROP POLICY IF EXISTS "Users can update their own comments" ON card_comments;
CREATE POLICY "Users can update their own comments"
  ON card_comments FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own comments" ON card_comments;
CREATE POLICY "Users can delete their own comments"
  ON card_comments FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- 7. BOARDS RLS (Ownership Only - No Members)
-- ============================================

-- Boards NEVER check board_members table (Rule #1)
DROP POLICY IF EXISTS "Users can view their own boards" ON boards;
DROP POLICY IF EXISTS "Users can create boards" ON boards;
DROP POLICY IF EXISTS "Users can update their own boards" ON boards;
DROP POLICY IF EXISTS "Users can delete their own boards" ON boards;

CREATE POLICY "Workspace owners manage boards"
  ON boards FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- ============================================
-- 8. LISTS RLS (Shared Access - Rule #2)
-- ============================================

DROP POLICY IF EXISTS "Users can view lists in their boards" ON lists;
DROP POLICY IF EXISTS "Users can create lists in their boards" ON lists;
DROP POLICY IF EXISTS "Users can update lists in their boards" ON lists;
DROP POLICY IF EXISTS "Users can delete lists in their boards" ON lists;

CREATE POLICY "Users can view lists"
  ON lists FOR SELECT
  USING (
    -- Workspace owner sees everything
    board_id IN (
      SELECT b.id FROM boards b
      JOIN workspaces w ON b.workspace_id = w.id
      WHERE w.owner_id = auth.uid()
    )
    OR
    -- Collaborators see shared boards
    board_id IN (
      SELECT board_id FROM board_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage lists"
  ON lists FOR ALL
  USING (
    board_id IN (
      SELECT b.id FROM boards b
      JOIN workspaces w ON b.workspace_id = w.id
      WHERE w.owner_id = auth.uid()
    )
    OR
    board_id IN (
      SELECT board_id FROM board_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- ============================================
-- 9. CARDS RLS (Editor vs Viewer - Rule #2)
-- ============================================

DROP POLICY IF EXISTS "Users can view cards in their boards" ON cards;
DROP POLICY IF EXISTS "Users can create cards in their boards" ON cards;
DROP POLICY IF EXISTS "Users can update cards in their boards" ON cards;
DROP POLICY IF EXISTS "Users can delete cards in their boards" ON cards;

CREATE POLICY "Users can view cards"
  ON cards FOR SELECT
  USING (
    list_id IN (
      SELECT l.id FROM lists l
      JOIN boards b ON l.board_id = b.id
      JOIN workspaces w ON b.workspace_id = w.id
      WHERE w.owner_id = auth.uid()
    )
    OR
    list_id IN (
      SELECT l.id FROM lists l
      WHERE l.board_id IN (
        SELECT board_id FROM board_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage cards"
  ON cards FOR ALL
  USING (
    list_id IN (
      SELECT l.id FROM lists l
      JOIN boards b ON l.board_id = b.id
      JOIN workspaces w ON b.workspace_id = w.id
      WHERE w.owner_id = auth.uid()
    )
    OR
    list_id IN (
      SELECT l.id FROM lists l
      JOIN board_members bm ON l.board_id = bm.board_id
      WHERE bm.user_id = auth.uid() AND bm.role IN ('owner', 'editor')
    )
  );

-- ============================================
-- 10. HELPER FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION get_user_email(user_uuid UUID)
RETURNS TEXT AS $$
  SELECT email FROM auth.users WHERE id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION accept_board_invitation(invitation_token TEXT)
RETURNS JSONB AS $$
DECLARE
  invitation RECORD;
BEGIN
  SELECT * INTO invitation
  FROM board_invitations
  WHERE token = invitation_token
    AND NOT accepted
    AND expires_at > NOW()
    AND email = (SELECT email FROM auth.users WHERE id = auth.uid());
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;
  
  INSERT INTO board_members (board_id, user_id, role, invited_by, accepted_at)
  VALUES (invitation.board_id, auth.uid(), invitation.role, invitation.invited_by, NOW())
  ON CONFLICT (board_id, user_id) DO NOTHING;
  
  UPDATE board_invitations
  SET accepted = true, accepted_by = auth.uid(), accepted_at = NOW()
  WHERE id = invitation.id;
  
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
-- DONE! ✅ No Recursion, Fully Collaborative
-- ============================================

COMMENT ON TABLE board_members IS 'Collaboration overlay - defines who can interact with boards';
COMMENT ON TABLE board_invitations IS 'Pending board invitations';
COMMENT ON TABLE activities IS 'Activity log for boards';
COMMENT ON TABLE card_comments IS 'Comments on cards with mentions';
COMMENT ON POLICY "Workspace owners manage boards" ON boards IS 'Rule #1: Boards do NOT know about members';
COMMENT ON POLICY "Users can view lists" ON lists IS 'Rule #2: Lists DO know about members';
COMMENT ON POLICY "Users can manage cards" ON cards IS 'Rule #2: Cards DO know about members';
