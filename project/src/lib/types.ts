export interface Profile {
  id: string;
  role: 'candidato' | 'rrhh';
  nombre: string;
  apellidos: string;
  telefono?: string;
  linkedin?: string;
  cv_url?: string;
  birth_date?: string;
  profile_image_url?: string;
  drivers_license?: string;
  emergency_titles?: string[];
  other_titles?: string[];
  experience_description?: string;
}

export interface Document {
  id: string;
  title: string;
  type: 'driver_license' | 'emergency_title' | 'other_title';
  file_url: string;
  version: number;
  status: 'pending' | 'approved' | 'rejected';
  expiry_date?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface EvaluationTemplate {
  id: string;
  name: string;
  description: string;
  position_type: string;
  max_score: number;
  passing_score: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SelectionProcess {
  id: string;
  job_offer_id: string;
  candidate_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  start_date: string;
  end_date?: string;
  notes?: string;
  required_assessments: string[];
  completed_assessments: string[];
}