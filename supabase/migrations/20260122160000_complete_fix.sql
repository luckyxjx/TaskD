-- Complete fix: Remove ALL recursion from board_members policies
-- The problem: board_members SELECT policy references itself

-- ============================================
-- 1. COMPLETELY REWRITE BOARD_MEMBERS POLICIES (NO RECURSION)
-- ============================================

DROP POLICY IF EXISTS "Users can view board members" ON board_members;
DROP POLICY IF EXISTS "Board owners can insert members" ON board_members;
DROP POLICY IF EXISTS "Board owners can delete members" ON board_members;

-- SELECT: Simple check - no recursion at all
CREATE POLICY "Users can view board members"
  ON board_members FOR SELECT
  USING (
    -- Can see own membership
    user_id = auth.uid()
    OR
    -- Can see members of boards in workspaces they own
    board_id IN (
      SELECT b.id FROM boards b
      JOIN workspaces w ON b.workspace_id = w.id
      WHERE w.owner_id = auth.uid()
    )
  );

-- INSERT: Allow workspace owners and existing board owners
CREATE POLICY "Board owners can insert members"
  ON board_members FOR INSERT
  WITH CHECK (
    -- Workspace owner can add members
    board_id IN (
      SELECT b.id FROM boards b
      JOIN workspaces w ON b.workspace_id = w.id
      WHERE w.owner_id = auth.uid()
    )
  );

-- DELETE: Only workspace owners can remove members
CREATE POLICY "Board owners can delete members"
  ON board_members FOR DELETE
  USING (
    board_id IN (
      SELECT b.id FROM boards b
      JOIN workspaces w ON b.workspace_id = w.id
      WHERE w.owner_id = auth.uid()
    )
  );

-- ============================================
-- 2. SIMPLIFY BOARDS POLICIES (Use workspace ownership primarily)
-- ============================================

DROP POLICY IF EXISTS "Users can view accessible boards" ON boards;
DROP POLICY IF EXISTS "Users can create boards in own workspaces" ON boards;
DROP POLICY IF EXISTS "Board owners can update" ON boards;
DROP POLICY IF EXISTS "Board owners can delete" ON boards;

-- View: Check workspace first, then board_members
CREATE POLICY "Users can view boards"
  ON boards FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
    OR
    id IN (
      SELECT board_id FROM board_members WHERE user_id = auth.uid()
    )
  );

-- Create: Only in own workspaces
CREATE POLICY "Users can create boards"
  ON boards FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Update: Workspace owners only
CREATE POLICY "Workspace owners can update boards"
  ON boards FOR UPDATE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Delete: Workspace owners only
CREATE POLICY "Workspace owners can delete boards"
  ON boards FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- ============================================
-- 3. SIMPLIFY LISTS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view lists" ON lists;
DROP POLICY IF EXISTS "Editors can manage lists" ON lists;

CREATE POLICY "Users can view lists"
  ON lists FOR SELECT
  USING (
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
-- 4. SIMPLIFY CARDS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view cards" ON cards;
DROP POLICY IF EXISTS "Editors can manage cards" ON cards;

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
      WHERE l.board_id IN (
        SELECT board_id FROM board_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
      )
    )
  );

-- ============================================
-- DONE! 🎉
-- ============================================

COMMENT ON POLICY "Users can view board members" ON board_members IS 'No recursion - checks workspace ownership directly';
COMMENT ON POLICY "Users can view boards" ON boards IS 'No recursion - workspace first, then board_members';
