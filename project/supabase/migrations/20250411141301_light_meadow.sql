/*
  # Update user role to RRHH

  1. Changes
    - Updates the role of a specific user to 'rrhh'
    
  2. Security
    - Only updates the specified user
    - Maintains existing RLS policies
*/

UPDATE profiles
SET role = 'rrhh'
WHERE id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'fjflopez@larioja.org'
);