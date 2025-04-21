/*
  # Add document verification and multiple experiences support

  1. New Tables
    - `driver_licenses`
      - `id` (uuid, primary key)
      - `profile_id` (uuid, references profiles)
      - `type` (text) - Type of license
      - `document_url` (text) - URL to verification document
      - `issue_date` (date) - When the license was issued
      - `expiry_date` (date) - When the license expires

    - `emergency_titles`
      - `id` (uuid, primary key)
      - `profile_id` (uuid, references profiles)
      - `title` (text) - Title name
      - `document_url` (text) - URL to verification document
      - `issue_date` (date) - When the title was issued
      - `expiry_date` (date, nullable) - When the title expires (if applicable)

    - `other_titles`
      - `id` (uuid, primary key)
      - `profile_id` (uuid, references profiles)
      - `title` (text) - Title name
      - `document_url` (text) - URL to verification document
      - `issue_date` (date) - When the title was issued
      - `expiry_date` (date, nullable) - When the title expires (if applicable)

    - `work_experiences`
      - `id` (uuid, primary key)
      - `profile_id` (uuid, references profiles)
      - `position` (text) - Job position
      - `company` (text) - Company name
      - `start_date` (date) - Start date
      - `end_date` (date, nullable) - End date (null if current)
      - `description` (text) - Job description

  2. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to manage their own data
*/

-- Driver Licenses
CREATE TABLE IF NOT EXISTS driver_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  document_url text,
  issue_date date,
  expiry_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE driver_licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own driver licenses"
  ON driver_licenses
  FOR ALL
  TO authenticated
  USING (profile_id = auth.uid());

-- Emergency Titles
CREATE TABLE IF NOT EXISTS emergency_titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  document_url text,
  issue_date date,
  expiry_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE emergency_titles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own emergency titles"
  ON emergency_titles
  FOR ALL
  TO authenticated
  USING (profile_id = auth.uid());

-- Other Titles
CREATE TABLE IF NOT EXISTS other_titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  document_url text,
  issue_date date,
  expiry_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE other_titles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own other titles"
  ON other_titles
  FOR ALL
  TO authenticated
  USING (profile_id = auth.uid());

-- Work Experiences
CREATE TABLE IF NOT EXISTS work_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  position text NOT NULL,
  company text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE work_experiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own work experiences"
  ON work_experiences
  FOR ALL
  TO authenticated
  USING (profile_id = auth.uid());