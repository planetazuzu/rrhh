import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Users } from 'lucide-react';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  bio: string;
  skills: string;
  experience: string;
  created_at: string;
}

export function AdminDashboard() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProfiles(data || []);
      } catch (err) {
        setError('Error al cargar los perfiles');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Users className="h-8 w-8 mr-3" />
            Perfiles de Candidatos
          </h1>
          <p className="text-gray-500">Total de Candidatos: {profiles.length}</p>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {profiles.map((profile) => (
              <li key={profile.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-indigo-600 truncate">
                        {profile.first_name} {profile.last_name}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {profile.email}
                      </p>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Activo
                      </span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-900">Habilidades</h4>
                    <p className="mt-1 text-sm text-gray-500">{profile.skills || 'Sin habilidades listadas'}</p>
                  </div>
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-900">Biografía</h4>
                    <p className="mt-1 text-sm text-gray-500">{profile.bio || 'Sin biografía disponible'}</p>
                  </div>
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-900">Experiencia</h4>
                    <p className="mt-1 text-sm text-gray-500">{profile.experience || 'Sin experiencia listada'}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}