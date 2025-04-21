/*
  # Create messages table and related policies

  1. New Tables
    - `messages`
      - `id` (uuid, primary key)
      - `sender_id` (uuid, references profiles.id)
      - `receiver_id` (uuid, references profiles.id)
      - `content` (text)
      - `created_at` (timestamp with time zone)
      - `read` (boolean)
      - `application_id` (uuid, references applications.id)

  2. Security
    - Enable RLS on messages table
    - Add policies for:
      - Users can read messages they sent or received
      - Users can create messages
      - Users can mark their received messages as read
*/

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  read boolean DEFAULT false,
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can read messages they sent or received
CREATE POLICY "Users can read their messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = sender_id OR 
    auth.uid() = receiver_id
  );

-- Users can create messages
CREATE POLICY "Users can create messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
  );

-- Users can mark messages as read
CREATE POLICY "Users can mark messages as read"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = receiver_id AND
    (read = true AND read IS DISTINCT FROM messages.read)
  );