import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Download } from 'lucide-react';

interface Profile {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  created_at: string;
  birth_date: string | null;
  telefono: string | null;
  profile_image_url: string | null;
  cv_url: string | null;
}

interface DriverLicense {
  id: string;
  type: string;
  document_url: string | null;
  issue_date: string;
  expiry_date: string;
}

interface Title {
  id: string;
  title: string;
  document_url: string | null;
  issue_date: string;
  expiry_date: string;
}

interface WorkExperience {
  id: string;
  position: string;
  company: string;
  start_date: string;
  end_date: string | null;
  description: string;
}

interface CandidateModalProps {
  profile: Profile;
  onClose: () => void;
}

export function CandidateModal({ profile, onClose }: CandidateModalProps) {
  const [driverLicenses, setDriverLicenses] = useState<DriverLicense[]>([]);
  const [emergencyTitles, setEmergencyTitles] = useState<Title[]>([]);
  const [otherTitles, setOtherTitles] = useState<Title[]>([]);
  const [workExperiences, setWorkExperiences] = useState<WorkExperience[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileDetails = async () => {
      try {
        // Fetch driver licenses
        const { data: licenses } = await supabase
          .from('driver_licenses')
          .select('*')
          .eq('profile_id', profile.id);
        setDriverLicenses(licenses || []);

        // Fetch emergency titles
        const { data: emergency } = await supabase
          .from('emergency_titles')
          .select('*')
          .eq('profile_id', profile.id);
        setEmergencyTitles(emergency || []);

        // Fetch other titles
        const { data: other } = await supabase
          .from('other_titles')
          .select('*')
          .eq('profile_id', profile.id);
        setOtherTitles(other || []);

        // Fetch work experiences
        const { data: experiences } = await supabase
          .from('work_experiences')
          .select('*')
          .eq('profile_id', profile.id)
          .order('start_date', { ascending: false });
        setWorkExperiences(experiences || []);
      } catch (error) {
        console.error('Error fetching profile details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileDetails();
  }, [profile.id]);

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {profile.nombre} {profile.apellidos}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Información básica</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Email</p>
                <p className="mt-1">{profile.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Teléfono</p>
                <p className="mt-1">{profile.telefono || 'No especificado'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Fecha de nacimiento</p>
                <p className="mt-1">
                  {profile.birth_date
                    ? new Date(profile.birth_date).toLocaleDateString()
                    : 'No especificada'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Fecha de inscripción</p>
                <p className="mt-1">{new Date(profile.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Profile Image */}
          {profile.profile_image_url && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Foto de perfil</h3>
              <img
                src={profile.profile_image_url}
                alt="Foto de perfil"
                className="h-32 w-32 rounded-full object-cover"
              />
            </div>
          )}

          {/* Driver Licenses */}
          {driverLicenses.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Carnets de conducir</h3>
              <div className="space-y-4">
                {driverLicenses.map((license) => (
                  <div key={license.id} className="border rounded-lg p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Tipo</p>
                        <p className="mt-1">{license.type}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Fecha de expedición</p>
                        <p className="mt-1">{new Date(license.issue_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Fecha de caducidad</p>
                        <p className="mt-1">{new Date(license.expiry_date).toLocaleDateString()}</p>
                      </div>
                      {license.document_url && (
                        <div>
                          <a
                            href={license.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-indigo-600 hover:text-indigo-500"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Ver documento
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emergency Titles */}
          {emergencyTitles.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Títulos de emergencias</h3>
              <div className="space-y-4">
                {emergencyTitles.map((title) => (
                  <div key={title.id} className="border rounded-lg p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Título</p>
                        <p className="mt-1">{title.title}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Fecha de expedición</p>
                        <p className="mt-1">{new Date(title.issue_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Fecha de caducidad</p>
                        <p className="mt-1">
                          {title.expiry_date
                            ? new Date(title.expiry_date).toLocaleDateString()
                            : 'No especificada'}
                        </p>
                      </div>
                      {title.document_url && (
                        <div>
                          <a
                            href={title.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-indigo-600 hover:text-indigo-500"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Ver documento
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other Titles */}
          {otherTitles.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Otros títulos</h3>
              <div className="space-y-4">
                {otherTitles.map((title) => (
                  <div key={title.id} className="border rounded-lg p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Título</p>
                        <p className="mt-1">{title.title}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Fecha de expedición</p>
                        <p className="mt-1">{new Date(title.issue_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Fecha de caducidad</p>
                        <p className="mt-1">
                          {title.expiry_date
                            ? new Date(title.expiry_date).toLocaleDateString()
                            : 'No especificada'}
                        </p>
                      </div>
                      {title.document_url && (
                        <div>
                          <a
                            href={title.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-indigo-600 hover:text-indigo-500"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Ver documento
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Work Experience */}
          {workExperiences.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Experiencia laboral</h3>
              <div className="space-y-4">
                {workExperiences.map((experience) => (
                  <div key={experience.id} className="border rounded-lg p-4">
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Puesto</p>
                        <p className="mt-1 text-lg font-medium">{experience.position}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Empresa</p>
                        <p className="mt-1">{experience.company}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Fecha de inicio</p>
                          <p className="mt-1">{new Date(experience.start_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Fecha de fin</p>
                          <p className="mt-1">
                            {experience.end_date
                              ? new Date(experience.end_date).toLocaleDateString()
                              : 'Actual'}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Descripción</p>
                        <p className="mt-1 whitespace-pre-wrap">{experience.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CV */}
          {profile.cv_url && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Curriculum Vitae</h3>
              <a
                href={profile.cv_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar CV
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}