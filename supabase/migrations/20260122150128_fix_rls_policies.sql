-- Fix RLS recursion issue by adding helper function and updating policies

-- Function to check if user is a member of a board (avoids recursion in policies)
CREATE OR REPLACE FUNCTION is_board_member(board_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM board_members
    WHERE board_id = board_uuid AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old policies that cause recursion
DROP POLICY IF EXISTS "Users can view board members of their boards" ON board_members;
DROP POLICY IF EXISTS "Board owners can manage members" ON board_members;
DROP POLICY IF EXISTS "Users can view boards they are members of" ON boards;
DROP POLICY IF EXISTS "Board owners can update boards" ON boards;
DROP POLICY IF EXISTS "Board owners can delete boards" ON boards;
DROP POLICY IF EXISTS "Users can view lists in accessible boards" ON lists;
DROP POLICY IF EXISTS "Editors can create lists" ON lists;
DROP POLICY IF EXISTS "Editors can update lists" ON lists;
DROP POLICY IF EXISTS "Editors can delete lists" ON lists;
DROP POLICY IF EXISTS "Users can view cards in accessible boards" ON cards;
DROP POLICY IF EXISTS "Editors can create cards" ON cards;
DROP POLICY IF EXISTS "Editors can update cards" ON cards;
DROP POLICY IF EXISTS "Editors can delete cards" ON cards;

-- Recreate policies using the helper function
CREATE POLICY "Users can view board members of their boards"
  ON board_members FOR SELECT
  USING (is_board_member(board_id) OR user_id = auth.uid());

CREATE POLICY "Board owners can manage members"
  ON board_members FOR ALL
  USING (
    is_board_member(board_id) AND EXISTS (
      SELECT 1 FROM board_members
      WHERE board_id = board_members.board_id
        AND user_id = auth.uid()
        AND role = 'owner'
    )
  );

CREATE POLICY "Users can view boards they are members of"
  ON boards FOR SELECT
  USING (is_board_member(id));

CREATE POLICY "Board owners can update boards"
  ON boards FOR UPDATE
  USING (
    is_board_member(id) AND EXISTS (
      SELECT 1 FROM board_members
      WHERE board_id = boards.id
        AND user_id = auth.uid()
        AND role = 'owner'
    )
  );

CREATE POLICY "Board owners can delete boards"
  ON boards FOR DELETE
  USING (
    is_board_member(id) AND EXISTS (
      SELECT 1 FROM board_members
      WHERE board_id = boards.id
        AND user_id = auth.uid()
        AND role = 'owner'
    )
  );

CREATE POLICY "Users can view lists in accessible boards"
  ON lists FOR SELECT
  USING (is_board_member(board_id));

CREATE POLICY "Editors can create lists"
  ON lists FOR INSERT
  WITH CHECK (
    is_board_member(board_id) AND EXISTS (
      SELECT 1 FROM board_members
      WHERE board_id = lists.board_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Editors can update lists"
  ON lists FOR UPDATE
  USING (
    is_board_member(board_id) AND EXISTS (
      SELECT 1 FROM board_members
      WHERE board_id = lists.board_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Editors can delete lists"
  ON lists FOR DELETE
  USING (
    is_board_member(board_id) AND EXISTS (
      SELECT 1 FROM board_members
      WHERE board_id = lists.board_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Users can view cards in accessible boards"
  ON cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lists l
      WHERE l.id = cards.list_id AND is_board_member(l.board_id)
    )
  );

CREATE POLICY "Editors can create cards"
  ON cards FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lists l
      JOIN board_members bm ON l.board_id = bm.board_id
      WHERE l.id = cards.list_id
        AND bm.user_id = auth.uid()
        AND bm.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Editors can update cards"
  ON cards FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM lists l
      JOIN board_members bm ON l.board_id = bm.board_id
      WHERE l.id = cards.list_id
        AND bm.user_id = auth.uid()
        AND bm.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Editors can delete cards"
  ON cards FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM lists l
      JOIN board_members bm ON l.board_id = bm.board_id
      WHERE l.id = cards.list_id
        AND bm.user_id = auth.uid()
        AND bm.role IN ('owner', 'editor')
    )
  );