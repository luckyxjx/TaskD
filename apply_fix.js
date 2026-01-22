// Quick script to apply the fix directly to Supabase
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://wetchpamscecqanlmcmq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndldGNocGFtc2NlY3FhbmxtY21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNzYxNzUsImV4cCI6MjA4NDY1MjE3NX0.curN-1wUKT51JHxsIKS75ump-ZoBBcA5meSBNHozXYc';

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = `
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
`;

console.log('Applying fix...');
console.log('\nPlease run this SQL in your Supabase SQL Editor:');
console.log('https://supabase.com/dashboard/project/wetchpamscecqanlmcmq/sql/new');
console.log('\n' + sql);
