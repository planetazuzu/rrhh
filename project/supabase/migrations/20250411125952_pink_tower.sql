/*
  # Job Offers and Applications Schema

  1. New Tables
    - `job_offers`
      - `id` (uuid, primary key)
      - `titulo` (text, required)
      - `descripcion` (text, required)
      - `ubicacion` (text, optional)
      - `fecha_publicacion` (timestamptz, default now())
      - `fecha_cierre` (timestamptz, optional)
      - `requisitos` (text, required)
      - `instrucciones_adicionales` (text, optional)
      - `estado` (text, default 'abierta')
      - `created_by` (uuid, references profiles.id)
    
    - `applications`
      - `id` (uuid, primary key)
      - `job_offer_id` (uuid, references job_offers.id)
      - `user_id` (uuid, references profiles.id)
      - `fecha_postulacion` (timestamptz, default now())
      - `estado` (text, default 'pendiente')

  2. Security
    - Enable RLS on both tables
    - Add policies for RRHH users to manage job offers
    - Add policies for candidates to view and apply to jobs
*/

-- Create job_offers table
CREATE TABLE public.job_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descripcion text NOT NULL,
  ubicacion text,
  fecha_publicacion timestamptz DEFAULT now(),
  fecha_cierre timestamptz,
  requisitos text NOT NULL,
  instrucciones_adicionales text,
  estado text DEFAULT 'abierta' CHECK (estado IN ('abierta', 'cerrada')),
  created_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create applications table
CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_offer_id uuid REFERENCES public.job_offers(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  fecha_postulacion timestamptz DEFAULT now(),
  estado text DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aceptada', 'rechazada')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Policies for job_offers
CREATE POLICY "RRHH can manage job offers"
  ON public.job_offers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'rrhh'
    )
  );

CREATE POLICY "Everyone can view active job offers"
  ON public.job_offers
  FOR SELECT
  TO authenticated
  USING (estado = 'abierta');

-- Policies for applications
CREATE POLICY "RRHH can view all applications"
  ON public.applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'rrhh'
    )
  );

CREATE POLICY "RRHH can manage applications"
  ON public.applications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'rrhh'
    )
  );

CREATE POLICY "Users can view their own applications"
  ON public.applications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create applications"
  ON public.applications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());