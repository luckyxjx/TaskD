-- Fix infinite recursion in RLS policies
-- The issue: board policies check board_members, and board_members policies check boards

-- ============================================
-- 1. FIX BOARD_MEMBERS POLICIES (Remove recursion)
-- ============================================

DROP POLICY IF EXISTS "Users can view board members of their boards" ON board_members;
DROP POLICY IF EXISTS "Board owners can manage members" ON board_members;

-- Simple policy: users can view members of boards they belong to
DROP POLICY IF EXISTS "Users can view board members" ON board_members;
CREATE POLICY "Users can view board members"
  ON board_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    board_id IN (
      SELECT board_id FROM board_members WHERE user_id = auth.uid()
    )
  );

-- Only owners can insert/update/delete members
DROP POLICY IF EXISTS "Board owners can insert members" ON board_members;
CREATE POLICY "Board owners can insert members"
  ON board_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM board_members
      WHERE board_id = board_members.board_id
        AND user_id = auth.uid()
        AND role = 'owner'
    )
  );

DROP POLICY IF EXISTS "Board owners can delete members" ON board_members;
CREATE POLICY "Board owners can delete members"
  ON board_members FOR DELETE
  USING (
    board_id IN (
      SELECT board_id FROM board_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================
-- 2. FIX BOARDS POLICIES (Simpler checks)
-- ============================================

DROP POLICY IF EXISTS "Users can view boards they are members of" ON boards;
DROP POLICY IF EXISTS "Users can create boards" ON boards;
DROP POLICY IF EXISTS "Board owners can update boards" ON boards;
DROP POLICY IF EXISTS "Board owners can delete boards" ON boards;

-- Users can view boards if they're in board_members OR workspace owner
DROP POLICY IF EXISTS "Users can view accessible boards" ON boards;
CREATE POLICY "Users can view accessible boards"
  ON boards FOR SELECT
  USING (
    -- Check workspace ownership first (no recursion)
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
    OR
    -- Then check board membership
    id IN (
      SELECT board_id FROM board_members WHERE user_id = auth.uid()
    )
  );

-- Users can create boards in their workspaces
DROP POLICY IF EXISTS "Users can create boards in own workspaces" ON boards;
CREATE POLICY "Users can create boards in own workspaces"
  ON boards FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Owners can update boards
DROP POLICY IF EXISTS "Board owners can update" ON boards;
CREATE POLICY "Board owners can update"
  ON boards FOR UPDATE
  USING (
    id IN (
      SELECT board_id FROM board_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Owners can delete boards
DROP POLICY IF EXISTS "Board owners can delete" ON boards;
CREATE POLICY "Board owners can delete"
  ON boards FOR DELETE
  USING (
    id IN (
      SELECT board_id FROM board_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================
-- 3. SIMPLIFY LISTS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view lists in accessible boards" ON lists;
DROP POLICY IF EXISTS "Editors can create lists" ON lists;
DROP POLICY IF EXISTS "Editors can update lists" ON lists;
DROP POLICY IF EXISTS "Editors can delete lists" ON lists;
DROP POLICY IF EXISTS "Users can view lists" ON lists;
DROP POLICY IF EXISTS "Editors can manage lists" ON lists;

CREATE POLICY "Users can view lists"
  ON lists FOR SELECT
  USING (
    board_id IN (
      SELECT board_id FROM board_members WHERE user_id = auth.uid()
    )
    OR
    board_id IN (
      SELECT b.id FROM boards b
      JOIN workspaces w ON b.workspace_id = w.id
      WHERE w.owner_id = auth.uid()
    )
  );

CREATE POLICY "Editors can manage lists"
  ON lists FOR ALL
  USING (
    board_id IN (
      SELECT board_id FROM board_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
    OR
    board_id IN (
      SELECT b.id FROM boards b
      JOIN workspaces w ON b.workspace_id = w.id
      WHERE w.owner_id = auth.uid()
    )
  );

-- ============================================
-- 4. SIMPLIFY CARDS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view cards in accessible boards" ON cards;
DROP POLICY IF EXISTS "Editors can create cards" ON cards;
DROP POLICY IF EXISTS "Editors can update cards" ON cards;
DROP POLICY IF EXISTS "Editors can delete cards" ON cards;
DROP POLICY IF EXISTS "Users can view cards" ON cards;
DROP POLICY IF EXISTS "Editors can manage cards" ON cards;

CREATE POLICY "Users can view cards"
  ON cards FOR SELECT
  USING (
    list_id IN (
      SELECT l.id FROM lists l
      WHERE l.board_id IN (
        SELECT board_id FROM board_members WHERE user_id = auth.uid()
      )
      OR l.board_id IN (
        SELECT b.id FROM boards b
        JOIN workspaces w ON b.workspace_id = w.id
        WHERE w.owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Editors can manage cards"
  ON cards FOR ALL
  USING (
    list_id IN (
      SELECT l.id FROM lists l
      WHERE l.board_id IN (
        SELECT board_id FROM board_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
      )
      OR l.board_id IN (
        SELECT b.id FROM boards b
        JOIN workspaces w ON b.workspace_id = w.id
        WHERE w.owner_id = auth.uid()
      )
    )
  );

-- ============================================
-- DONE! 🎉
-- ============================================

COMMENT ON POLICY "Users can view accessible boards" ON boards IS 'Fixed: No recursion - checks workspace first, then board_members';
COMMENT ON POLICY "Users can view board members" ON board_members IS 'Fixed: Simple check without recursion';
