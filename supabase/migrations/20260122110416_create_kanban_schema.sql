/*
  # Kanban Productivity App Schema

  ## Overview
  Creates the complete database schema for a Kanban productivity application with
  workspaces, boards, lists, and cards.

  ## New Tables
  
  ### `workspaces`
  - `id` (uuid, primary key) - Unique workspace identifier
  - `name` (text) - Workspace name
  - `owner_id` (uuid, foreign key) - References auth.users
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `boards`
  - `id` (uuid, primary key) - Unique board identifier
  - `workspace_id` (uuid, foreign key) - References workspaces
  - `name` (text) - Board name
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `lists`
  - `id` (uuid, primary key) - Unique list identifier
  - `board_id` (uuid, foreign key) - References boards
  - `name` (text) - List name
  - `position` (integer) - Sort order position
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `cards`
  - `id` (uuid, primary key) - Unique card identifier
  - `list_id` (uuid, foreign key) - References lists
  - `title` (text) - Card title
  - `description` (text, nullable) - Card description
  - `position` (integer) - Sort order position
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  - Enable RLS on all tables
  - Users can only access workspaces they own
  - Users can only access boards in their workspaces
  - Users can only access lists in their boards
  - Users can only access cards in their lists
*/

-- Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create boards table
CREATE TABLE IF NOT EXISTS boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create lists table
CREATE TABLE IF NOT EXISTS lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create cards table
CREATE TABLE IF NOT EXISTS cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- Workspaces policies
CREATE POLICY "Users can view own workspaces"
  ON workspaces FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own workspaces"
  ON workspaces FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own workspaces"
  ON workspaces FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own workspaces"
  ON workspaces FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Boards policies
CREATE POLICY "Users can view boards in own workspaces"
  ON boards FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = boards.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create boards in own workspaces"
  ON boards FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = boards.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update boards in own workspaces"
  ON boards FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = boards.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = boards.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete boards in own workspaces"
  ON boards FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = boards.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );

-- Lists policies
CREATE POLICY "Users can view lists in own boards"
  ON lists FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM boards
      JOIN workspaces ON workspaces.id = boards.workspace_id
      WHERE boards.id = lists.board_id
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create lists in own boards"
  ON lists FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM boards
      JOIN workspaces ON workspaces.id = boards.workspace_id
      WHERE boards.id = lists.board_id
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update lists in own boards"
  ON lists FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM boards
      JOIN workspaces ON workspaces.id = boards.workspace_id
      WHERE boards.id = lists.board_id
      AND workspaces.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM boards
      JOIN workspaces ON workspaces.id = boards.workspace_id
      WHERE boards.id = lists.board_id
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete lists in own boards"
  ON lists FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM boards
      JOIN workspaces ON workspaces.id = boards.workspace_id
      WHERE boards.id = lists.board_id
      AND workspaces.owner_id = auth.uid()
    )
  );

-- Cards policies
CREATE POLICY "Users can view cards in own lists"
  ON cards FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lists
      JOIN boards ON boards.id = lists.board_id
      JOIN workspaces ON workspaces.id = boards.workspace_id
      WHERE lists.id = cards.list_id
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create cards in own lists"
  ON cards FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lists
      JOIN boards ON boards.id = lists.board_id
      JOIN workspaces ON workspaces.id = boards.workspace_id
      WHERE lists.id = cards.list_id
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update cards in own lists"
  ON cards FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lists
      JOIN boards ON boards.id = lists.board_id
      JOIN workspaces ON workspaces.id = boards.workspace_id
      WHERE lists.id = cards.list_id
      AND workspaces.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lists
      JOIN boards ON boards.id = lists.board_id
      JOIN workspaces ON workspaces.id = boards.workspace_id
      WHERE lists.id = cards.list_id
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete cards in own lists"
  ON cards FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lists
      JOIN boards ON boards.id = lists.board_id
      JOIN workspaces ON workspaces.id = boards.workspace_id
      WHERE lists.id = cards.list_id
      AND workspaces.owner_id = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_boards_workspace_id ON boards(workspace_id);
CREATE INDEX IF NOT EXISTS idx_lists_board_id ON lists(board_id);
CREATE INDEX IF NOT EXISTS idx_lists_position ON lists(board_id, position);
CREATE INDEX IF NOT EXISTS idx_cards_list_id ON cards(list_id);
CREATE INDEX IF NOT EXISTS idx_cards_position ON cards(list_id, position);