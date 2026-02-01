-- URGENT FIX: Allow non-owner members to leave boards
-- Run this in Supabase Dashboard SQL Editor NOW

-- Drop existing DELETE policy if any
DROP POLICY IF EXISTS "Members can leave boards" ON board_members;
DROP POLICY IF EXISTS "Non-owners can delete own membership" ON board_members;

-- Create DELETE policy: Users can delete their own membership ONLY if they're not the owner
CREATE POLICY "Non-owners can delete own membership"
  ON board_members FOR DELETE
  USING (
    user_id = auth.uid()
    AND role != 'owner'  -- Prevent owners from leaving their own boards
  );

-- Verify the policy was created
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'board_members'
  AND cmd = 'DELETE'
ORDER BY policyname;

-- Test: Check your current board memberships where you're not the owner
-- (These are the boards you should be able to leave)
SELECT 
  bm.id,
  b.name as board_name,
  bm.role,
  bm.user_id = auth.uid() as is_you
FROM board_members bm
JOIN boards b ON b.id = bm.board_id
WHERE bm.user_id = auth.uid()
  AND bm.role != 'owner';
