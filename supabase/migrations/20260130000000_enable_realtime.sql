-- Enable Realtime for all tables
-- This allows Supabase to broadcast changes to subscribed clients

-- Enable realtime on boards table
ALTER TABLE boards REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE boards;

-- Enable realtime on lists table
ALTER TABLE lists REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE lists;

-- Enable realtime on cards table
ALTER TABLE cards REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE cards;

-- Enable realtime on board_members table
ALTER TABLE board_members REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE board_members;

-- Enable realtime on board_invitations table
ALTER TABLE board_invitations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE board_invitations;

-- Enable realtime on activities table
ALTER TABLE activities REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE activities;

-- Enable realtime on card_comments table
ALTER TABLE card_comments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE card_comments;
