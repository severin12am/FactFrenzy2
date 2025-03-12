/*
  # Create leaderboard table

  1. New Tables
    - `leaderboard`
      - `id` (uuid, primary key)
      - `nickname` (text, unique)
      - `score` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `leaderboard` table
    - Add policies for:
      - Anyone can read the leaderboard
      - Authenticated users can update their own scores
*/

CREATE TABLE IF NOT EXISTS leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname text UNIQUE NOT NULL,
  score integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read the leaderboard
CREATE POLICY "Anyone can read leaderboard"
  ON leaderboard
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to update their own scores
CREATE POLICY "Users can update their own scores"
  ON leaderboard
  FOR UPDATE
  TO authenticated
  USING (auth.email() LIKE nickname || '%')
  WITH CHECK (auth.email() LIKE nickname || '%');

-- Allow authenticated users to insert their own scores
CREATE POLICY "Users can insert their own scores"
  ON leaderboard
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.email() LIKE nickname || '%');