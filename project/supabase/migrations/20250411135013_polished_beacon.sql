/*
  # Add evaluation templates and automated assessments

  1. New Tables
    - `evaluation_templates`: Stores scoring templates for different position types
    - `evaluation_criteria`: Stores individual criteria within templates
    - `skill_assessments`: Stores automated skill evaluation configurations
    - `assessment_questions`: Stores questions for automated assessments
    - `assessment_results`: Stores candidate assessment results
    - `email_notifications`: Stores email notification templates and logs

  2. Changes
    - Add new columns to `candidate_evaluations` for template reference
    - Add new columns to `selection_processes` for assessment tracking

  3. Security
    - Enable RLS on all new tables
    - Add policies for RRHH access
    - Add policies for candidate access to their own assessments
*/

-- Evaluation Templates
CREATE TABLE IF NOT EXISTS evaluation_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  position_type text NOT NULL,
  max_score integer NOT NULL DEFAULT 100,
  passing_score integer NOT NULL DEFAULT 70,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Evaluation Criteria
CREATE TABLE IF NOT EXISTS evaluation_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES evaluation_templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  weight integer NOT NULL DEFAULT 1,
  min_score integer NOT NULL DEFAULT 0,
  max_score integer NOT NULL DEFAULT 10,
  order_index integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Skill Assessments
CREATE TABLE IF NOT EXISTS skill_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  skill_type text NOT NULL,
  time_limit_minutes integer,
  passing_score integer NOT NULL DEFAULT 70,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Assessment Questions
CREATE TABLE IF NOT EXISTS assessment_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES skill_assessments(id) ON DELETE CASCADE,
  question text NOT NULL,
  question_type text NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'open_ended')),
  options jsonb,
  correct_answer text,
  points integer NOT NULL DEFAULT 1,
  order_index integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Assessment Results
CREATE TABLE IF NOT EXISTS assessment_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES skill_assessments(id) ON DELETE CASCADE,
  candidate_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  process_id uuid REFERENCES selection_processes(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  score integer,
  answers jsonb,
  status text NOT NULL CHECK (status IN ('in_progress', 'completed', 'expired')),
  created_at timestamptz DEFAULT now()
);

-- Email Notifications
CREATE TABLE IF NOT EXISTS email_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('process_update', 'assessment_invitation', 'interview_scheduled', 'evaluation_complete')),
  recipient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  content text NOT NULL,
  sent_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Add template reference to candidate_evaluations
ALTER TABLE candidate_evaluations
ADD COLUMN template_id uuid REFERENCES evaluation_templates(id),
ADD COLUMN criteria_scores jsonb;

-- Add assessment tracking to selection_processes
ALTER TABLE selection_processes
ADD COLUMN required_assessments uuid[] DEFAULT '{}',
ADD COLUMN completed_assessments uuid[] DEFAULT '{}';

-- Enable RLS
ALTER TABLE evaluation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Evaluation Templates
CREATE POLICY "RRHH can manage evaluation templates"
  ON evaluation_templates
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

-- Evaluation Criteria
CREATE POLICY "RRHH can manage evaluation criteria"
  ON evaluation_criteria
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

-- Skill Assessments
CREATE POLICY "RRHH can manage skill assessments"
  ON skill_assessments
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

CREATE POLICY "Candidates can view assigned assessments"
  ON skill_assessments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM selection_processes
      WHERE selection_processes.candidate_id = auth.uid()
      AND skill_assessments.id = ANY(selection_processes.required_assessments)
    )
  );

-- Assessment Questions
CREATE POLICY "RRHH can manage assessment questions"
  ON assessment_questions
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

CREATE POLICY "Candidates can view questions for their assessments"
  ON assessment_questions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM selection_processes
      WHERE selection_processes.candidate_id = auth.uid()
      AND assessment_questions.assessment_id = ANY(selection_processes.required_assessments)
    )
  );

-- Assessment Results
CREATE POLICY "RRHH can view all assessment results"
  ON assessment_results
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'rrhh'
    )
  );

CREATE POLICY "Candidates can manage their own assessment results"
  ON assessment_results
  TO authenticated
  USING (candidate_id = auth.uid())
  WITH CHECK (candidate_id = auth.uid());

-- Email Notifications
CREATE POLICY "RRHH can view all email notifications"
  ON email_notifications
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'rrhh'
    )
  );

CREATE POLICY "Users can view their own email notifications"
  ON email_notifications
  FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

-- Triggers
CREATE OR REPLACE FUNCTION create_process_update_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Create in-app notification
  INSERT INTO notifications (
    user_id,
    type,
    title,
    content,
    related_id
  ) VALUES (
    NEW.candidate_id,
    'process_update',
    'Actualización del proceso de selección',
    CASE
      WHEN NEW.status = 'in_progress' THEN 'Tu proceso de selección ha comenzado'
      WHEN NEW.status = 'completed' THEN 'Tu proceso de selección ha finalizado'
      WHEN NEW.status = 'rejected' THEN 'Lo sentimos, tu proceso de selección ha sido rechazado'
      ELSE 'Tu proceso de selección ha sido actualizado'
    END,
    NEW.id
  );

  -- Create email notification
  INSERT INTO email_notifications (
    type,
    recipient_id,
    subject,
    content
  ) VALUES (
    'process_update',
    NEW.candidate_id,
    CASE
      WHEN NEW.status = 'in_progress' THEN 'Proceso de selección iniciado'
      WHEN NEW.status = 'completed' THEN 'Proceso de selección completado'
      WHEN NEW.status = 'rejected' THEN 'Actualización sobre tu postulación'
      ELSE 'Actualización del proceso de selección'
    END,
    CASE
      WHEN NEW.status = 'in_progress' THEN 
        'Tu proceso de selección ha comenzado. Por favor, mantente atento a las próximas etapas.'
      WHEN NEW.status = 'completed' THEN
        'Felicitaciones! Tu proceso de selección ha finalizado exitosamente.'
      WHEN NEW.status = 'rejected' THEN
        'Lamentamos informarte que no continuaremos con tu proceso de selección. Te agradecemos tu interés y te deseamos éxito en tu búsqueda laboral.'
      ELSE
        'Ha habido una actualización en tu proceso de selección. Por favor, ingresa a la plataforma para más detalles.'
    END
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER process_update_notification_trigger
  AFTER UPDATE OF status ON selection_processes
  FOR EACH ROW
  EXECUTE FUNCTION create_process_update_notification();

-- Function to send assessment invitation
CREATE OR REPLACE FUNCTION create_assessment_invitation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.required_assessments IS DISTINCT FROM OLD.required_assessments THEN
    -- Create email notification for new assessments
    INSERT INTO email_notifications (
      type,
      recipient_id,
      subject,
      content
    )
    SELECT
      'assessment_invitation',
      NEW.candidate_id,
      'Evaluación de habilidades pendiente',
      'Se te ha asignado una nueva evaluación de habilidades. Por favor, ingresa a la plataforma para completarla.'
    WHERE NEW.required_assessments <> '{}';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assessment_invitation_trigger
  AFTER UPDATE OF required_assessments ON selection_processes
  FOR EACH ROW
  EXECUTE FUNCTION create_assessment_invitation();

-- Function to notify when evaluation is complete
CREATE OR REPLACE FUNCTION notify_evaluation_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    -- Create email notification
    INSERT INTO email_notifications (
      type,
      recipient_id,
      subject,
      content
    )
    SELECT
      'evaluation_complete',
      sp.candidate_id,
      'Evaluación completada',
      'Una evaluación de tu proceso de selección ha sido completada. Por favor, ingresa a la plataforma para ver los resultados.'
    FROM selection_processes sp
    WHERE sp.id = NEW.process_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER evaluation_complete_notification_trigger
  AFTER UPDATE OF status ON candidate_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION notify_evaluation_complete();