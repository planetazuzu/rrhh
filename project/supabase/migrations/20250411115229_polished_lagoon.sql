/*
  # Create storage bucket for CVs

  1. Storage
    - Create a new storage bucket named 'cvs' for storing CV files
    - Enable public access to the bucket
    - Set up security policies for file access

  2. Security
    - Allow authenticated users to upload files to their own folder
    - Allow public access to read CV files
*/

-- Create storage bucket for CVs
INSERT INTO storage.buckets (id, name, public)
VALUES ('cvs', 'cvs', true);

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload their own CVs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cvs' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update their own CVs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'cvs' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow public access to read CV files
CREATE POLICY "CVs are publicly accessible"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'cvs');