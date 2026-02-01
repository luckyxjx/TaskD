-- URGENT: Run this SQL in Supabase Dashboard to fix infinite recursion

-- Drop all board_members policies
DROP POLICY IF EXISTS "Board members can view other members" ON board_members;
DROP POLICY IF EXISTS "Board owners can manage members" ON board_members;
DROP POLICY IF EXISTS "Board owners can add members" ON board_members;
DROP POLICY IF EXISTS "Board owners can remove members" ON board_members;
DROP POLICY IF EXISTS "Board owners can update member roles" ON board_members;
DROP POLICY IF EXISTS "Members can leave boards" ON board_members;
DROP POLICY IF EXISTS "Users can view board members" ON board_members;
DROP POLICY IF EXISTS "Users can manage board members" ON board_members;
DROP POLICY IF EXISTS "Users can read own board memberships" ON board_members;

-- CORRECT FIX: Users can ONLY see their own memberships (no recursion)
CREATE POLICY "Users can read own board memberships"
  ON board_members FOR SELECT
  USING (
    user_id = auth.uid()
  );

-- Note: Viewing ALL board members and managing members should be done
-- via application code with SECURITY DEFINER functions, not RLS
