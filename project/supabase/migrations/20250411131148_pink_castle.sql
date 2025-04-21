/*
  # Add job categories and activity tracking

  1. New Columns
    - Add tipo_trabajo and categoria to job_offers table
    - Add indexes for improved search performance

  2. New Tables
    - activities table for tracking system actions
      - id (uuid, primary key)
      - tipo (text)
      - descripcion (text)
      - fecha (timestamp)
      - usuario_id (uuid)
      - oferta_id (uuid, optional)

  3. Security
    - Enable RLS on activities table
    - Add policies for RRHH users
*/

-- Add new columns to job_offers
ALTER TABLE job_offers
ADD COLUMN IF NOT EXISTS tipo_trabajo text CHECK (tipo_trabajo IN ('tiempo_completo', 'medio_tiempo', 'temporal')),
ADD COLUMN IF NOT EXISTS categoria text CHECK (categoria IN ('emergencias', 'sanitario', 'administrativo'));

-- Create activities table
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('creacion', 'modificacion', 'eliminacion')),
  descripcion text NOT NULL,
  fecha timestamptz DEFAULT now(),
  usuario_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  oferta_id uuid REFERENCES job_offers(id) ON DELETE CASCADE
);

-- Add indexes for improved search performance
CREATE INDEX IF NOT EXISTS idx_job_offers_tipo_trabajo ON job_offers(tipo_trabajo);
CREATE INDEX IF NOT EXISTS idx_job_offers_categoria ON job_offers(categoria);
CREATE INDEX IF NOT EXISTS idx_job_offers_ubicacion ON job_offers(ubicacion);
CREATE INDEX IF NOT EXISTS idx_activities_fecha ON activities(fecha);

-- Enable RLS on activities
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Only RRHH can view activities
CREATE POLICY "RRHH can view activities"
  ON activities
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'rrhh'
    )
  );

-- Create function to log activities
CREATE OR REPLACE FUNCTION log_job_offer_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activities (tipo, descripcion, usuario_id, oferta_id)
    VALUES ('creacion', 'Nueva oferta de trabajo creada: ' || NEW.titulo, NEW.created_by, NEW.id);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO activities (tipo, descripcion, usuario_id, oferta_id)
    VALUES ('modificacion', 'Oferta de trabajo modificada: ' || NEW.titulo, NEW.created_by, NEW.id);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activities (tipo, descripcion, usuario_id, oferta_id)
    VALUES ('eliminacion', 'Oferta de trabajo eliminada: ' || OLD.titulo, OLD.created_by, OLD.id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for job_offers
DROP TRIGGER IF EXISTS job_offer_activity_trigger ON job_offers;
CREATE TRIGGER job_offer_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON job_offers
  FOR EACH ROW
  EXECUTE FUNCTION log_job_offer_activity();