/*
  # Create admin user with RRHH role

  1. Changes
    - Insert a new admin user into the auth.users table
    - Set the user's role to 'rrhh' in the profiles table
    - Add email confirmation and password hash
*/

-- Create admin user in auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'ad4f1396-a1b2-4c3d-8a45-b9209c76f3ab',
  'authenticated',
  'authenticated',
  'admin@empresa.com',
  crypt('Admin123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"nombre": "Admin", "apellidos": "RRHH"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- Create profile for admin user
INSERT INTO public.profiles (
  id,
  role,
  nombre,
  apellidos
) VALUES (
  'ad4f1396-a1b2-4c3d-8a45-b9209c76f3ab',
  'rrhh',
  'Admin',
  'RRHH'
);