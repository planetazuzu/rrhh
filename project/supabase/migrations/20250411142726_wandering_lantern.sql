/*
  # Fix notifications RLS policy

  1. Changes
    - Add RLS policy to allow the job_offer_notification_trigger to create notifications
    - This policy ensures that the trigger can create notifications while maintaining security

  2. Security
    - Maintains existing RLS policies
    - Adds specific policy for notification creation from triggers
*/

-- Add policy to allow trigger-based notification creation
CREATE POLICY "Allow trigger-based notification creation"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow notifications created by triggers
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'rrhh'
  )
);

-- Ensure RLS is enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;