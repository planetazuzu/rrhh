/*
  # Fix RLS policies for activities table

  1. Changes
    - Enable RLS on activities table (it was disabled)
    - Add policy for RRHH users to manage activities
    - Add policy for RRHH users to insert activities when creating job offers

  2. Security
    - Enable RLS on activities table
    - Add policies to restrict access to RRHH users only
    - Ensure activities can only be created by RRHH users
*/

-- Enable RLS on activities table
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Add policy for RRHH users to manage activities
CREATE POLICY "RRHH can manage activities"
ON activities
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'rrhh'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'rrhh'
  )
);