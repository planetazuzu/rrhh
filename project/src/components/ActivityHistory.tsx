import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { History, Clock, AlertCircle } from 'lucide-react';

interface Activity {
  id: string;
  tipo: string;
  descripcion: string;
  fecha: string;
  usuario_id: string;
  oferta_id: string | null;
  usuario: {
    nombre: string;
    apellidos: string;
  };
  oferta?: {
    titulo: string;
  };
}

export function ActivityHistory() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: fetchError } = await supabase
        .from('activities')
        .select(`
          *,
          usuario:profiles!activities_usuario_id_fkey(nombre, apellidos),
          oferta:job_offers(titulo)
        `)
        .order('fecha', { ascending: false });

      if (fetchError) throw fetchError;
      setActivities(data || []);
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError('Error al cargar el historial de actividades');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
          <History className="h-5 w-5 mr-2" />
          Historial de Actividades
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Registro de todas las acciones realizadas en el sistema
        </p>
      </div>
      <div className="border-t border-gray-200">
        <ul className="divide-y divide-gray-200">
          {activities.map((activity) => (
            <li key={activity.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <p className="ml-2 text-sm font-medium text-gray-900">
                    {new Date(activity.fecha).toLocaleString()}
                  </p>
                </div>
                <div className="ml-2 flex-shrink-0">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    activity.tipo === 'creacion' ? 'bg-green-100 text-green-800' :
                    activity.tipo === 'modificacion' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {activity.tipo}
                  </span>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-sm text-gray-500">{activity.descripcion}</p>
                <div className="mt-2 text-sm text-gray-500">
                  <span className="font-medium">Usuario: </span>
                  {activity.usuario.nombre} {activity.usuario.apellidos}
                  {activity.oferta && (
                    <>
                      <span className="mx-2">·</span>
                      <span className="font-medium">Oferta: </span>
                      {activity.oferta.titulo}
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}