/*
  # Selection Process Management Tables

  1. New Tables
    - `selection_processes`
      - Tracks overall selection processes
      - Links to job offers and candidates
      - Stores process status and timeline
    
    - `process_stages`
      - Defines stages within a selection process
      - Configurable stages with requirements
      - Tracks stage order and criteria

    - `candidate_evaluations`
      - Stores candidate scores and feedback
      - Links to specific process stages
      - Tracks evaluation status and comments

    - `interviews`
      - Manages interview scheduling
      - Links to processes and candidates
      - Tracks interview status and feedback

  2. Security
    - Enable RLS on all tables
    - RRHH can manage all records
    - Candidates can only view their own records
*/

-- Selection Processes Table
CREATE TABLE IF NOT EXISTS selection_processes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_offer_id uuid REFERENCES job_offers(id) ON DELETE CASCADE,
  candidate_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE selection_processes ENABLE ROW LEVEL SECURITY;

-- Process Stages Table
CREATE TABLE IF NOT EXISTS process_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid REFERENCES selection_processes(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  order_index integer NOT NULL,
  requirements text,
  is_required boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE process_stages ENABLE ROW LEVEL SECURITY;

-- Candidate Evaluations Table
CREATE TABLE IF NOT EXISTS candidate_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid REFERENCES process_stages(id) ON DELETE CASCADE,
  evaluator_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  score integer CHECK (score >= 0 AND score <= 100),
  feedback text,
  status text NOT NULL CHECK (status IN ('pending', 'passed', 'failed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE candidate_evaluations ENABLE ROW LEVEL SECURITY;

-- Interviews Table
CREATE TABLE IF NOT EXISTS interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid REFERENCES selection_processes(id) ON DELETE CASCADE,
  interviewer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  scheduled_date timestamptz NOT NULL,
  duration_minutes integer NOT NULL,
  location text,
  meeting_link text,
  status text NOT NULL CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Selection Processes Policies
CREATE POLICY "RRHH can manage selection processes"
  ON selection_processes
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

CREATE POLICY "Candidates can view their own processes"
  ON selection_processes
  FOR SELECT
  TO authenticated
  USING (candidate_id = auth.uid());

-- Process Stages Policies
CREATE POLICY "RRHH can manage process stages"
  ON process_stages
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

CREATE POLICY "Candidates can view stages of their processes"
  ON process_stages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM selection_processes
      WHERE selection_processes.id = process_stages.process_id
      AND selection_processes.candidate_id = auth.uid()
    )
  );

-- Candidate Evaluations Policies
CREATE POLICY "RRHH can manage evaluations"
  ON candidate_evaluations
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

CREATE POLICY "Candidates can view their evaluations"
  ON candidate_evaluations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM process_stages
      JOIN selection_processes ON process_stages.process_id = selection_processes.id
      WHERE process_stages.id = candidate_evaluations.stage_id
      AND selection_processes.candidate_id = auth.uid()
    )
  );

-- Interviews Policies
CREATE POLICY "RRHH can manage interviews"
  ON interviews
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

CREATE POLICY "Candidates can view their interviews"
  ON interviews
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM selection_processes
      WHERE selection_processes.id = interviews.process_id
      AND selection_processes.candidate_id = auth.uid()
    )
  );

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_selection_processes_updated_at
  BEFORE UPDATE ON selection_processes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_process_stages_updated_at
  BEFORE UPDATE ON process_stages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidate_evaluations_updated_at
  BEFORE UPDATE ON candidate_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interviews_updated_at
  BEFORE UPDATE ON interviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Notification Function for Interview Scheduling
CREATE OR REPLACE FUNCTION create_interview_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    title,
    content,
    related_id
  )
  SELECT
    sp.candidate_id,
    'interview_scheduled',
    'Entrevista programada',
    'Se ha programado una entrevista para el ' || 
    to_char(NEW.scheduled_date, 'DD/MM/YYYY HH24:MI'),
    NEW.id
  FROM selection_processes sp
  WHERE sp.id = NEW.process_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER interview_notification_trigger
  AFTER INSERT ON interviews
  FOR EACH ROW
  EXECUTE FUNCTION create_interview_notification();