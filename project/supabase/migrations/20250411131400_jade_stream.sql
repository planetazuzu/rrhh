/*
  # Sistema de notificaciones

  1. Nueva tabla
    - `notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `type` (text): tipo de notificación
      - `title` (text): título de la notificación
      - `content` (text): contenido de la notificación
      - `read` (boolean): si la notificación ha sido leída
      - `created_at` (timestamp): fecha de creación
      - `related_id` (uuid): ID relacionado (oferta, aplicación, etc.)

  2. Seguridad
    - Enable RLS
    - Políticas para que los usuarios solo vean sus notificaciones
    - Políticas para marcar notificaciones como leídas

  3. Triggers
    - Trigger para nuevos mensajes
    - Trigger para cambios en aplicaciones
    - Trigger para nuevas ofertas
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('message', 'application_status', 'new_job_offer')),
  title text NOT NULL,
  content text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  related_id uuid
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can read their notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can mark their notifications as read
CREATE POLICY "Users can mark their notifications as read"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid() AND
    (read = true AND read IS DISTINCT FROM notifications.read)
  );

-- Function to create notification for new messages
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, content, related_id)
  VALUES (
    NEW.receiver_id,
    'message',
    'Nuevo mensaje',
    (SELECT 'Mensaje de ' || nombre || ' ' || apellidos 
     FROM profiles 
     WHERE id = NEW.sender_id),
    NEW.application_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create notification for application status changes
CREATE OR REPLACE FUNCTION create_application_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado != OLD.estado THEN
    INSERT INTO notifications (user_id, type, title, content, related_id)
    VALUES (
      NEW.user_id,
      'application_status',
      'Estado de postulación actualizado',
      'Tu postulación ha sido ' || NEW.estado,
      NEW.job_offer_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create notification for new job offers
CREATE OR REPLACE FUNCTION create_job_offer_notification()
RETURNS TRIGGER AS $$
DECLARE
  profile_record RECORD;
BEGIN
  FOR profile_record IN 
    SELECT id 
    FROM profiles 
    WHERE role != 'rrhh'
  LOOP
    INSERT INTO notifications (user_id, type, title, content, related_id)
    VALUES (
      profile_record.id,
      'new_job_offer',
      'Nueva oferta de trabajo',
      'Se ha publicado una nueva oferta: ' || NEW.titulo,
      NEW.id
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER message_notification_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION create_message_notification();

CREATE TRIGGER application_notification_trigger
  AFTER UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION create_application_notification();

CREATE TRIGGER job_offer_notification_trigger
  AFTER INSERT ON job_offers
  FOR EACH ROW
  EXECUTE FUNCTION create_job_offer_notification();