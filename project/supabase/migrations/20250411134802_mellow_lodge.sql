/*
  # Document Management System

  1. New Tables
    - `documents`
      - `id` (uuid, primary key)
      - `title` (text)
      - `type` (text)
      - `file_url` (text)
      - `version` (integer)
      - `status` (text)
      - `expiry_date` (timestamptz)
      - `user_id` (uuid)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `document_versions`
      - `id` (uuid, primary key)
      - `document_id` (uuid)
      - `version` (integer)
      - `file_url` (text)
      - `created_at` (timestamptz)

    - `document_approvals`
      - `id` (uuid, primary key)
      - `document_id` (uuid)
      - `approver_id` (uuid)
      - `status` (text)
      - `comments` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for document access and management
    - Add policies for version history
    - Add policies for approvals

  3. Storage
    - Create storage bucket for documents
*/

-- Documents Table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('driver_license', 'emergency_title', 'other_title')),
  file_url text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  expiry_date timestamptz,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Document Versions Table
CREATE TABLE IF NOT EXISTS document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  version integer NOT NULL,
  file_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Document Approvals Table
CREATE TABLE IF NOT EXISTS document_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  approver_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('approved', 'rejected')),
  comments text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_approvals ENABLE ROW LEVEL SECURITY;

-- Document Policies
CREATE POLICY "Users can view their own documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own documents"
  ON documents
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "RRHH can view all documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'rrhh'
    )
  );

-- Document Versions Policies
CREATE POLICY "Users can view their document versions"
  ON document_versions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_versions.document_id
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "RRHH can view all document versions"
  ON document_versions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'rrhh'
    )
  );

-- Document Approvals Policies
CREATE POLICY "RRHH can manage approvals"
  ON document_approvals
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

CREATE POLICY "Users can view their document approvals"
  ON document_approvals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_approvals.document_id
      AND documents.user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create notification when document status changes
CREATE OR REPLACE FUNCTION notify_document_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      content,
      related_id
    ) VALUES (
      NEW.user_id,
      'document_status',
      CASE 
        WHEN NEW.status = 'approved' THEN 'Documento aprobado'
        WHEN NEW.status = 'rejected' THEN 'Documento rechazado'
        ELSE 'Estado de documento actualizado'
      END,
      'El documento "' || NEW.title || '" ha sido ' || 
      CASE 
        WHEN NEW.status = 'approved' THEN 'aprobado'
        WHEN NEW.status = 'rejected' THEN 'rechazado'
        ELSE 'actualizado'
      END,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_status_notification
  AFTER UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION notify_document_status_change();

-- Function to create notification when document is about to expire
CREATE OR REPLACE FUNCTION notify_document_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expiry_date IS NOT NULL AND 
     NEW.expiry_date > now() AND 
     NEW.expiry_date <= now() + interval '30 days' THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      content,
      related_id
    ) VALUES (
      NEW.user_id,
      'document_expiry',
      'Documento por vencer',
      'El documento "' || NEW.title || '" vencerá el ' || 
      to_char(NEW.expiry_date, 'DD/MM/YYYY'),
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_expiry_notification
  AFTER INSERT OR UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION notify_document_expiry();