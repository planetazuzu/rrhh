import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { Save, Upload, Camera, Plus, Trash2 } from 'lucide-react';

interface DriverLicense {
  id?: string;
  type: string;
  documentUrl?: string;
  issueDate: string;
  expiryDate: string;
}

interface Title {
  id?: string;
  title: string;
  documentUrl?: string;
  issueDate: string;
  expiryDate: string;
}

interface WorkExperience {
  id?: string;
  position: string;
  company: string;
  startDate: string;
  endDate?: string;
  description: string;
}

interface ProfileState {
  nombre: string;
  apellidos: string;
  birthDate: string;
  profileImageUrl: string;
  driverLicenses: DriverLicense[];
  emergencyTitles: Title[];
  otherTitles: Title[];
  workExperiences: WorkExperience[];
  cvUrl: string;
}

const defaultProfile: ProfileState = {
  nombre: '',
  apellidos: '',
  birthDate: '',
  profileImageUrl: '',
  driverLicenses: [],
  emergencyTitles: [],
  otherTitles: [],
  workExperiences: [],
  cvUrl: '',
};

// Helper function to handle empty dates
const handleEmptyDate = (date: string | null | undefined): string | null => {
  if (!date || date.trim() === '') {
    return null;
  }
  return date;
};

export function ProfileForm() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [profile, setProfile] = useState<ProfileState>(defaultProfile);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (user) {
          // Get profile data
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          // Get driver licenses
          const { data: licenses } = await supabase
            .from('driver_licenses')
            .select('*')
            .eq('profile_id', user.id);

          // Get emergency titles
          const { data: emergency } = await supabase
            .from('emergency_titles')
            .select('*')
            .eq('profile_id', user.id);

          // Get other titles
          const { data: other } = await supabase
            .from('other_titles')
            .select('*')
            .eq('profile_id', user.id);

          // Get work experiences
          const { data: experiences } = await supabase
            .from('work_experiences')
            .select('*')
            .eq('profile_id', user.id);

          setProfile({
            nombre: profileData?.nombre || '',
            apellidos: profileData?.apellidos || '',
            birthDate: profileData?.birth_date || '',
            profileImageUrl: profileData?.profile_image_url || '',
            driverLicenses: licenses?.map(l => ({
              id: l.id,
              type: l.type,
              documentUrl: l.document_url,
              issueDate: l.issue_date,
              expiryDate: l.expiry_date,
            })) || [],
            emergencyTitles: emergency?.map(t => ({
              id: t.id,
              title: t.title,
              documentUrl: t.document_url,
              issueDate: t.issue_date,
              expiryDate: t.expiry_date,
            })) || [],
            otherTitles: other?.map(t => ({
              id: t.id,
              title: t.title,
              documentUrl: t.document_url,
              issueDate: t.issue_date,
              expiryDate: t.expiry_date,
            })) || [],
            workExperiences: experiences?.map(e => ({
              id: e.id,
              position: e.position,
              company: e.company,
              startDate: e.start_date,
              endDate: e.end_date,
              description: e.description,
            })) || [],
            cvUrl: profileData?.cv_url || '',
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setMessage({ 
          type: 'error', 
          text: 'Error al cargar el perfil. Por favor, recarga la página.'
        });
      } finally {
        setLoading(false);
      }
    };

    getUser();
  }, []);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'cv' | 'profile' | 'document',
    itemType?: 'license' | 'emergency' | 'other',
    itemIndex?: number
  ) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }
      const file = event.target.files[0];
      
      if (type === 'cv' && file.type !== 'application/pdf') {
        throw new Error('Solo se permiten archivos PDF');
      }
      if ((type === 'profile' || type === 'document') && !file.type.startsWith('image/') && file.type !== 'application/pdf') {
        throw new Error('Solo se permiten archivos de imagen o PDF');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      setUploading(true);

      let bucketName = type === 'cv' ? 'cvs' : 
                      type === 'profile' ? 'profile-images' : 
                      'documents';

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      if (type === 'cv') {
        setProfile({ ...profile, cvUrl: publicUrl });
      } else if (type === 'profile') {
        setProfile({ ...profile, profileImageUrl: publicUrl });
      } else if (type === 'document' && itemType && typeof itemIndex === 'number') {
        const updatedProfile = { ...profile };
        if (itemType === 'license') {
          updatedProfile.driverLicenses[itemIndex].documentUrl = publicUrl;
        } else if (itemType === 'emergency') {
          updatedProfile.emergencyTitles[itemIndex].documentUrl = publicUrl;
        } else if (itemType === 'other') {
          updatedProfile.otherTitles[itemIndex].documentUrl = publicUrl;
        }
        setProfile(updatedProfile);
      }

      setMessage({ 
        type: 'success', 
        text: 'Documento subido correctamente'
      });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Error al subir el archivo'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          nombre: profile.nombre,
          apellidos: profile.apellidos,
          birth_date: handleEmptyDate(profile.birthDate),
          profile_image_url: profile.profileImageUrl,
          cv_url: profile.cvUrl,
        });

      if (profileError) throw profileError;

      // Update driver licenses
      for (const license of profile.driverLicenses) {
        const { error } = await supabase
          .from('driver_licenses')
          .upsert({
            id: license.id,
            profile_id: user.id,
            type: license.type,
            document_url: license.documentUrl,
            issue_date: handleEmptyDate(license.issueDate),
            expiry_date: handleEmptyDate(license.expiryDate),
          });
        if (error) throw error;
      }

      // Update emergency titles
      for (const title of profile.emergencyTitles) {
        const { error } = await supabase
          .from('emergency_titles')
          .upsert({
            id: title.id,
            profile_id: user.id,
            title: title.title,
            document_url: title.documentUrl,
            issue_date: handleEmptyDate(title.issueDate),
            expiry_date: handleEmptyDate(title.expiryDate),
          });
        if (error) throw error;
      }

      // Update other titles
      for (const title of profile.otherTitles) {
        const { error } = await supabase
          .from('other_titles')
          .upsert({
            id: title.id,
            profile_id: user.id,
            title: title.title,
            document_url: title.documentUrl,
            issue_date: handleEmptyDate(title.issueDate),
            expiry_date: handleEmptyDate(title.expiryDate),
          });
        if (error) throw error;
      }

      // Update work experiences
      for (const exp of profile.workExperiences) {
        const { error } = await supabase
          .from('work_experiences')
          .upsert({
            id: exp.id,
            profile_id: user.id,
            position: exp.position,
            company: exp.company,
            start_date: handleEmptyDate(exp.startDate),
            end_date: handleEmptyDate(exp.endDate),
            description: exp.description,
          });
        if (error) throw error;
      }

      setMessage({ type: 'success', text: '¡Perfil actualizado correctamente!' });
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Error al actualizar el perfil' });
    }
  };

  const addDriverLicense = () => {
    setProfile({
      ...profile,
      driverLicenses: [...profile.driverLicenses, {
        type: '',
        issueDate: '',
        expiryDate: '',
      }],
    });
  };

  const addEmergencyTitle = () => {
    setProfile({
      ...profile,
      emergencyTitles: [...profile.emergencyTitles, {
        title: '',
        issueDate: '',
        expiryDate: '',
      }],
    });
  };

  const addOtherTitle = () => {
    setProfile({
      ...profile,
      otherTitles: [...profile.otherTitles, {
        title: '',
        issueDate: '',
        expiryDate: '',
      }],
    });
  };

  const addWorkExperience = () => {
    setProfile({
      ...profile,
      workExperiences: [...profile.workExperiences, {
        position: '',
        company: '',
        startDate: '',
        description: '',
      }],
    });
  };

  const removeDriverLicense = (index: number) => {
    const updated = [...profile.driverLicenses];
    updated.splice(index, 1);
    setProfile({ ...profile, driverLicenses: updated });
  };

  const removeEmergencyTitle = (index: number) => {
    const updated = [...profile.emergencyTitles];
    updated.splice(index, 1);
    setProfile({ ...profile, emergencyTitles: updated });
  };

  const removeOtherTitle = (index: number) => {
    const updated = [...profile.otherTitles];
    updated.splice(index, 1);
    setProfile({ ...profile, otherTitles: updated });
  };

  const removeWorkExperience = (index: number) => {
    const updated = [...profile.workExperiences];
    updated.splice(index, 1);
    setProfile({ ...profile, workExperiences: updated });
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!user) {
    return <div>Por favor, inicia sesión para ver esta página.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Tu Perfil</h1>

      <form onSubmit={handleSubmit} className="space-y-8 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        {/* Profile Image Section */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            {profile.profileImageUrl ? (
              <img
                src={profile.profileImageUrl}
                alt="Foto de perfil"
                className="h-32 w-32 rounded-full object-cover"
              />
            ) : (
              <div className="h-32 w-32 rounded-full bg-gray-200 flex items-center justify-center">
                <Camera className="h-12 w-12 text-gray-400" />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, 'profile')}
              className="sr-only"
              id="profile-image"
            />
            <label
              htmlFor="profile-image"
              className="absolute bottom-0 right-0 bg-indigo-600 rounded-full p-2 cursor-pointer hover:bg-indigo-700"
            >
              <Camera className="h-5 w-5 text-white" />
            </label>
          </div>
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">
              Nombre
            </label>
            <input
              type="text"
              id="nombre"
              value={profile.nombre}
              onChange={(e) => setProfile({ ...profile, nombre: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="apellidos" className="block text-sm font-medium text-gray-700">
              Apellidos
            </label>
            <input
              type="text"
              id="apellidos"
              value={profile.apellidos}
              onChange={(e) => setProfile({ ...profile, apellidos: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700">
            Fecha de nacimiento
          </label>
          <input
            type="date"
            id="birthDate"
            value={profile.birthDate}
            onChange={(e) => setProfile({ ...profile, birthDate: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        {/* Driver Licenses Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Carnets de conducir</h3>
            <button
              type="button"
              onClick={addDriverLicense}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Añadir carnet
            </button>
          </div>
          
          {profile.driverLicenses.map((license, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-4">
              <div className="flex justify-between">
                <h4 className="text-sm font-medium text-gray-700">Carnet #{index + 1}</h4>
                <button
                  type="button"
                  onClick={() => removeDriverLicense(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tipo</label>
                  <input
                    type="text"
                    value={license.type}
                    onChange={(e) => {
                      const updated = [...profile.driverLicenses];
                      updated[index].type = e.target.value;
                      setProfile({ ...profile, driverLicenses: updated });
                    }}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Ej: B, C1, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha de expedición</label>
                  <input
                    type="date"
                    value={license.issueDate}
                    onChange={(e) => {
                      const updated = [...profile.driverLicenses];
                      updated[index].issueDate = e.target.value;
                      setProfile({ ...profile, driverLicenses: updated });
                    }}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha de caducidad</label>
                  <input
                    type="date"
                    value={license.expiryDate}
                    onChange={(e) => {
                      const updated = [...profile.driverLicenses];
                      updated[index].expiryDate = e.target.value;
                      setProfile({ ...profile, driverLicenses: updated });
                    }}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Documento</label>
                  <div className="mt-1 flex items-center">
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => handleFileUpload(e, 'document', 'license', index)}
                      className="sr-only"
                      id={`license-doc-${index}`}
                    />
                    <label
                      htmlFor={`license-doc-${index}`}
                      className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Subir documento
                    </label>
                    {license.documentUrl && (
                      <a
                        href={license.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-4 text-sm text-indigo-600 hover:text-indigo-500"
                      >
                        Ver documento
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Emergency Titles Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Títulos de emergencias</h3>
            <button
              type="button"
              onClick={addEmergencyTitle}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Añadir título
            </button>
          </div>
          
          {profile.emergencyTitles.map((title, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-4">
              <div className="flex justify-between">
                <h4 className="text-sm font-medium text-gray-700">Título #{index + 1}</h4>
                <button
                  type="button"
                  onClick={() => removeEmergencyTitle(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Título</label>
                  <input
                    type="text"
                    value={title.title}
                    onChange={(e) => {
                      const updated = [...profile.emergencyTitles];
                      updated[index].title = e.target.value;
                      setProfile({ ...profile, emergencyTitles: updated });
                    }}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Ej: TES, SVB, DESA"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha de expedición</label>
                  <input
                    type="date"
                    value={title.issueDate}
                    onChange={(e) => {
                      const updated = [...profile.emergencyTitles];
                      updated[index].issueDate = e.target.value;
                      setProfile({ ...profile, emergencyTitles: updated });
                    }}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha de caducidad</label>
                  <input
                    type="date"
                    value={title.expiryDate}
                    onChange={(e) => {
                      const updated = [...profile.emergencyTitles];
                      updated[index].expiryDate = e.target.value;
                      setProfile({ ...profile, emergencyTitles: updated });
                    }}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Documento</label>
                  <div className="mt-1 flex items-center">
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => handleFileUpload(e, 'document', 'emergency', index)}
                      className="sr-only"
                      id={`emergency-doc-${index}`}
                    />
                    <label
                      htmlFor={`emergency-doc-${index}`}
                      className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Subir documento
                    </label>
                    {title.documentUrl && (
                      <a
                        href={title.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-4 text-sm text-indigo-600 hover:text-indigo-500"
                      >
                        Ver documento
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Other Titles Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Otros títulos</h3>
            <button
              type="button"
              onClick={addOtherTitle}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Añadir título
            </button>
          </div>
          
          {profile.otherTitles.map((title, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-4">
              <div className="flex justify-between">
                <h4 className="text-sm font-medium text-gray-700">Título #{index +1}</h4>
                <button
                  type="button"
                  onClick={() => removeOtherTitle(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Título</label>
                  <input
                    type="text"
                    value={title.title}
                    onChange={(e) => {
                      const updated = [...profile.otherTitles];
                      updated[index].title = e.target.value;
                      setProfile({ ...profile, otherTitles: updated });
                    }}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Nombre del título"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha de expedición</label>
                  <input
                    type="date"
                    value={title.issueDate}
                    onChange={(e) => {
                      const updated = [...profile.otherTitles];
                      updated[index].issueDate = e.target.value;
                      setProfile({ ...profile, otherTitles: updated });
                    }}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha de caducidad</label>
                  <input
                    type="date"
                    value={title.expiryDate}
                    onChange={(e) => {
                      const updated = [...profile.otherTitles];
                      updated[index].expiryDate = e.target.value;
                      setProfile({ ...profile, otherTitles: updated });
                    }}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Documento</label>
                  <div className="mt-1 flex items-center">
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => handleFileUpload(e, 'document', 'other', index)}
                      className="sr-only"
                      id={`other-doc-${index}`}
                    />
                    <label
                      htmlFor={`other-doc-${index}`}
                      className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Subir documento
                    </label>
                    {title.documentUrl && (
                      <a
                        href={title.documentUrl}
                        target="_blank"
                        rel="noopener norefer
rer"
                        className="ml-4 text-sm text-indigo-600 hover:text-indigo-500"
                      >
                        Ver documento
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Work Experience Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Experiencia laboral</h3>
            <button
              type="button"
              onClick={addWorkExperience}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Añadir experiencia
            </button>
          </div>
          
          {profile.workExperiences.map((experience, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-4">
              <div className="flex justify-between">
                <h4 className="text-sm font-medium text-gray-700">Experiencia #{index + 1}</h4>
                <button
                  type="button"
                  onClick={() => removeWorkExperience(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Puesto</label>
                  <input
                    type="text"
                    value={experience.position}
                    onChange={(e) => {
                      const updated = [...profile.workExperiences];
                      updated[index].position = e.target.value;
                      setProfile({ ...profile, workExperiences: updated });
                    }}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Cargo o puesto"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Empresa</label>
                  <input
                    type="text"
                    value={experience.company}
                    onChange={(e) => {
                      const updated = [...profile.workExperiences];
                      updated[index].company = e.target.value;
                      setProfile({ ...profile, workExperiences: updated });
                    }}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Nombre de la empresa"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha de inicio</label>
                  <input
                    type="date"
                    value={experience.startDate}
                    onChange={(e) => {
                      const updated = [...profile.workExperiences];
                      updated[index].startDate = e.target.value;
                      setProfile({ ...profile, workExperiences: updated });
                    }}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha de fin</label>
                  <input
                    type="date"
                    value={experience.endDate}
                    onChange={(e) => {
                      const updated = [...profile.workExperiences];
                      updated[index].endDate = e.target.value;
                      setProfile({ ...profile, workExperiences: updated });
                    }}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Descripción</label>
                  <textarea
                    value={experience.description}
                    onChange={(e) => {
                      const updated = [...profile.workExperiences];
                      updated[index].description = e.target.value;
                      setProfile({ ...profile, workExperiences: updated });
                    }}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Describe tus responsabilidades y logros"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CV Upload Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Curriculum Vitae (PDF)
          </label>
          <div className="mt-1 flex items-center">
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => handleFileUpload(e, 'cv')}
              className="sr-only"
              id="cv-upload"
            />
            <label
              htmlFor="cv-upload"
              className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Upload className="h-5 w-5 mr-2" />
              {uploading ? 'Subiendo...' : 'Subir CV'}
            </label>
            {profile.cvUrl && (
              <a
                href={profile.cvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-4 text-sm text-indigo-600 hover:text-indigo-500"
              >
                Ver CV actual
              </a>
            )}
          </div>
        </div>

        {message && (
          <div className={`rounded-md p-4 ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Save className="h-5 w-5 mr-2" />
            Guardar Cambios
          </button>
        </div>
      </form>
    </div>
  );
}