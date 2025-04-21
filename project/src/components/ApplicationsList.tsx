import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { MessageSquare, Calendar, User, ChevronRight } from 'lucide-react';
import { MessagesPanel } from './MessagesPanel';

interface Application {
  id: string;
  job_offer_id: string;
  user_id: string;
  fecha_postulacion: string;
  estado: string;
  job_offer: {
    titulo: string;
  };
  profile: {
    nombre: string;
    apellidos: string;
  };
}

export function ApplicationsList() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    checkUserRole();
    fetchApplications();
  }, []);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    setUserRole(profile?.role || null);
  };

  const fetchApplications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('applications')
        .select(`
          *,
          job_offer:job_offers(titulo),
          profile:profiles!user_id(nombre, apellidos)
        `)
        .order('fecha_postulacion', { ascending: false });

      // If user is not RRHH, only show their own applications
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'rrhh') {
        query = query.eq('user_id', user.id);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setApplications(data || []);
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError('Error al cargar las postulaciones');
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (applicationId: string, newStatus: string) => {
    try {
      const { error: updateError } = await supabase
        .from('applications')
        .update({ estado: newStatus })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      setApplications(current =>
        current.map(app =>
          app.id === applicationId ? { ...app, estado: newStatus } : app
        )
      );
    } catch (err) {
      console.error('Error updating application status:', err);
      setError('Error al actualizar el estado de la postulación');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Postulaciones</h1>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <ul className="divide-y divide-gray-200">
            {applications.map((application) => (
              <li key={application.id}>
                <div className="block hover:bg-gray-50">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <User className="h-5 w-5 text-gray-400" />
                        <p className="ml-2 text-sm font-medium text-gray-900">
                          {application.profile.nombre} {application.profile.apellidos}
                        </p>
                      </div>
                      <div className="ml-2 flex-shrink-0 flex">
                        <button
                          onClick={() => setSelectedApplication(
                            selectedApplication?.id === application.id ? null : application
                          )}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Mensajes
                        </button>
                        {userRole === 'rrhh' && (
                          <select
                            value={application.estado}
                            onChange={(e) => updateApplicationStatus(application.id, e.target.value)}
                            className="ml-3 block w-full pl-3 pr-10 py-1 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="aceptada">Aceptada</option>
                            <option value="rechazada">Rechazada</option>
                          </select>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          <ChevronRight className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          {application.job_offer.titulo}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        <p>
                          Postulación: {new Date(application.fecha_postulacion).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {selectedApplication?.id === application.id && (
                      <div className="mt-4">
                        <MessagesPanel
                          applicationId={application.id}
                          receiverId={userRole === 'rrhh' ? application.user_id : application.job_offer.created_by}
                          receiverName={userRole === 'rrhh' 
                            ? `${application.profile.nombre} ${application.profile.apellidos}`
                            : 'Recursos Humanos'
                          }
                        />
                      </div>
                    )}
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