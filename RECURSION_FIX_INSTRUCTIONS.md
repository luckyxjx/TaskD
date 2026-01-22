# Fix for Infinite Recursion Error

## Problem
When creating boards on Vercel, you're getting:
```
infinite recursion detected in policy for relation "board_members"
```

## Root Cause
The trigger `add_board_owner_as_member()` tries to INSERT into `board_members` when a board is created, but the INSERT policy on `board_members` checks the `board_members` table itself, creating infinite recursion.

## Solution
Remove the trigger and handle adding board owners in the application code instead.

## Steps to Fix

### 1. Run this SQL in Supabase SQL Editor

Go to: https://supabase.com/dashboard/project/wetchpamscecqanlmcmq/sql/new

Copy and paste this SQL:

```sql
-- Drop the problematic trigger
DROP TRIGGER IF EXISTS trigger_add_board_owner ON boards;
DROP FUNCTION IF EXISTS add_board_owner_as_member();

-- Add helper function for application to use
CREATE OR REPLACE FUNCTION add_user_as_board_owner(board_uuid UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO board_members (board_id, user_id, role, accepted_at)
  VALUES (board_uuid, auth.uid(), 'owner', NOW())
  ON CONFLICT (board_id, user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Click "Run" to execute.

### 2. Deploy the Updated Code

The Dashboard.tsx file has already been updated to call the new function after creating a board.

Just deploy to Vercel:
```bash
git add .
git commit -m "Fix infinite recursion in board creation"
git push
```

### 3. Test

1. Go to your deployed app on Vercel
2. Try creating a new board
3. It should work without the recursion error!

## What Changed

**Before:** Trigger automatically added board owner → caused recursion

**After:** Application manually adds board owner using `add_user_as_board_owner()` function → no recursion

## Files Modified

- `supabase/migrations/20260122170000_remove_trigger_fix_recursion.sql` - New migration
- `supabase/migrations/20260122180000_final_trigger_removal.sql` - Idempotent version
- `src/pages/Dashboard.tsx` - Updated `createBoard()` to manually add owner
- `fix_recursion.sql` - Quick SQL script for manual execution

## Next Steps

Once this is working, you can continue with Phase 1 implementation:
- ✅ Phase 1.1: Board Sharing (UI complete, just needed this fix)
- Phase 1.2: Real-time updates
- Phase 1.3: Activity log
- Phase 1.4: Comments
