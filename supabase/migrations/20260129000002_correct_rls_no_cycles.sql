-- CORRECT RLS FIX - NO CIRCULAR DEPENDENCIES
-- Rule: board_members → auth.uid() ONLY
--       boards → board_members (one direction only)
-- NO CYCLES EVER!

-- ============================================
-- 1. board_members - SIMPLE, NO RECURSION
-- ============================================

DROP POLICY IF EXISTS "Users can view board members" ON board_members;
DROP POLICY IF EXISTS "Workspace owners can manage members" ON board_members;
DROP POLICY IF EXISTS "Users can read own board memberships" ON board_members;

-- Users can ONLY see their own memberships
CREATE POLICY "Users can read own board memberships"
  ON board_members FOR SELECT
  USING (
    user_id = auth.uid()
  );

-- Note: Member management (INSERT/UPDATE/DELETE) should be done via
-- Supabase RPC functions with SECURITY DEFINER, not via RLS policies

-- ============================================
-- 2. boards - DEPENDS ON board_members ONLY
-- ============================================

DROP POLICY IF EXISTS "Workspace owners manage boards" ON boards;
DROP POLICY IF EXISTS "Users can view boards" ON boards;
DROP POLICY IF EXISTS "Board members can view boards" ON boards;
DROP POLICY IF EXISTS "Workspace owners can create boards" ON boards;
DROP POLICY IF EXISTS "Users can update boards" ON boards;
DROP POLICY IF EXISTS "Editors and owners can update boards" ON boards;
DROP POLICY IF EXISTS "Workspace owners can delete boards" ON boards;

-- SELECT: Board members can view boards
CREATE POLICY "Board members can view boards"
  ON boards FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM board_members bm
      WHERE bm.board_id = boards.id
        AND bm.user_id = auth.uid()
    )
  );

-- UPDATE: Editors and owners can update boards
CREATE POLICY "Editors and owners can update boards"
  ON boards FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM board_members bm
      WHERE bm.board_id = boards.id
        AND bm.user_id = auth.uid()
        AND bm.role IN ('owner', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM board_members bm
      WHERE bm.board_id = boards.id
        AND bm.user_id = auth.uid()
        AND bm.role IN ('owner', 'editor')
    )
  );

-- INSERT: Handle via RPC function (see below)
-- DELETE: Handle via RPC function (see below)

-- ============================================
-- 3. lists - DEPENDS ON board_members
-- ============================================

DROP POLICY IF EXISTS "Users can view lists" ON lists;
DROP POLICY IF EXISTS "Users can manage lists" ON lists;

CREATE POLICY "Board members can view lists"
  ON lists FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM board_members bm
      WHERE bm.board_id = lists.board_id
        AND bm.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can manage lists"
  ON lists FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM board_members bm
      WHERE bm.board_id = lists.board_id
        AND bm.user_id = auth.uid()
        AND bm.role IN ('owner', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM board_members bm
      WHERE bm.board_id = lists.board_id
        AND bm.user_id = auth.uid()
        AND bm.role IN ('owner', 'editor')
    )
  );

-- ============================================
-- 4. cards - DEPENDS ON board_members
-- ============================================

DROP POLICY IF EXISTS "Users can view cards" ON cards;
DROP POLICY IF EXISTS "Users can manage cards" ON cards;

CREATE POLICY "Board members can view cards"
  ON cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM lists l
      JOIN board_members bm ON bm.board_id = l.board_id
      WHERE l.id = cards.list_id
        AND bm.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can manage cards"
  ON cards FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM lists l
      JOIN board_members bm ON bm.board_id = l.board_id
      WHERE l.id = cards.list_id
        AND bm.user_id = auth.uid()
        AND bm.role IN ('owner', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM lists l
      JOIN board_members bm ON bm.board_id = l.board_id
      WHERE l.id = cards.list_id
        AND bm.user_id = auth.uid()
        AND bm.role IN ('owner', 'editor')
    )
  );

-- ============================================
-- 5. RPC Functions for Workspace Owner Actions
-- ============================================

-- Function to create board (workspace owner only)
CREATE OR REPLACE FUNCTION create_board_as_owner(
  p_workspace_id UUID,
  p_board_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_board_id UUID;
BEGIN
  -- Check if user owns the workspace
  IF NOT EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = p_workspace_id 
    AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You do not own this workspace';
  END IF;

  -- Create board
  INSERT INTO boards (workspace_id, name)
  VALUES (p_workspace_id, p_board_name)
  RETURNING id INTO v_board_id;

  -- Add creator as owner in board_members
  INSERT INTO board_members (board_id, user_id, role, accepted_at)
  VALUES (v_board_id, auth.uid(), 'owner', NOW());

  RETURN v_board_id;
END;
$$;

-- Function to delete board (workspace owner only)
CREATE OR REPLACE FUNCTION delete_board_as_owner(
  p_board_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user owns the workspace that contains this board
  IF NOT EXISTS (
    SELECT 1 
    FROM boards b
    JOIN workspaces w ON b.workspace_id = w.id
    WHERE b.id = p_board_id 
    AND w.owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You do not own this board''s workspace';
  END IF;

  -- Delete board (cascade will handle board_members, lists, cards, etc.)
  DELETE FROM boards WHERE id = p_board_id;

  RETURN TRUE;
END;
$$;

-- Function to add/remove board members (workspace owner only)
CREATE OR REPLACE FUNCTION manage_board_member(
  p_board_id UUID,
  p_user_id UUID,
  p_role TEXT,
  p_action TEXT -- 'add', 'update', 'remove'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user owns the workspace that contains this board
  IF NOT EXISTS (
    SELECT 1 
    FROM boards b
    JOIN workspaces w ON b.workspace_id = w.id
    WHERE b.id = p_board_id 
    AND w.owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You do not own this board''s workspace';
  END IF;

  -- Perform action
  IF p_action = 'add' THEN
    INSERT INTO board_members (board_id, user_id, role, accepted_at)
    VALUES (p_board_id, p_user_id, p_role, NOW())
    ON CONFLICT (board_id, user_id) DO NOTHING;
  ELSIF p_action = 'update' THEN
    UPDATE board_members
    SET role = p_role
    WHERE board_id = p_board_id AND user_id = p_user_id;
  ELSIF p_action = 'remove' THEN
    DELETE FROM board_members
    WHERE board_id = p_board_id AND user_id = p_user_id;
  ELSE
    RAISE EXCEPTION 'Invalid action: %', p_action;
  END IF;

  RETURN TRUE;
END;
$$;

-- ============================================
-- Comments
-- ============================================

COMMENT ON POLICY "Users can read own board memberships" ON board_members
IS 'Simple, non-recursive: users see only their own memberships';

COMMENT ON POLICY "Board members can view boards" ON boards
IS 'One-directional: boards → board_members (no cycles)';

COMMENT ON POLICY "Editors and owners can update boards" ON boards
IS 'Role-based access via board_members';

COMMENT ON FUNCTION create_board_as_owner
IS 'Workspace owners create boards via RPC (not RLS)';

COMMENT ON FUNCTION delete_board_as_owner
IS 'Workspace owners delete boards via RPC (not RLS)';

COMMENT ON FUNCTION manage_board_member
IS 'Workspace owners manage board members via RPC (not RLS)';
