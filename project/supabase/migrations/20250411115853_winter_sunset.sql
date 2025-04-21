/*
  # Add new profile fields

  1. Changes
    - Add new columns to profiles table:
      - birth_date (date)
      - profile_image_url (text)
      - drivers_license (text)
      - emergency_titles (text[])
      - other_titles (text[])
      - experience_description (text)

  2. Storage
    - Create a new bucket for profile images
*/

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS profile_image_url text,
ADD COLUMN IF NOT EXISTS drivers_license text,
ADD COLUMN IF NOT EXISTS emergency_titles text[],
ADD COLUMN IF NOT EXISTS other_titles text[],
ADD COLUMN IF NOT EXISTS experience_description text;

-- Create storage bucket for profile images
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true);

-- Allow authenticated users to upload their own profile images
CREATE POLICY "Users can upload their own profile images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-images' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own profile images
CREATE POLICY "Users can update their own profile images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-images' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow public access to read profile images
CREATE POLICY "Profile images are publicly accessible"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-images');