import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MapPin, Calendar, AlertCircle, CheckCircle2, MessageCircle } from 'lucide-react';
import { MessagesPanel } from './MessagesPanel';

interface JobOffer {
  id: string;
  titulo: string;
  descripcion: string;
  ubicacion: string | null;
  fecha_publicacion: string;
  fecha_cierre: string | null;
  requisitos: string;
  instrucciones_adicionales: string | null;
  estado: string;
  created_by: string;
}

interface Application {
  id: string;
  job_offer_id: string;
  user_id: string;
  fecha_postulacion: string;
  estado: string;
}

interface Profile {
  id: string;
  nombre: string;
  apellidos: string;
  role: string;
}

export function JobOfferDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [offer, setOffer] = useState<JobOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [hrProfile, setHrProfile] = useState<Profile | null>(null);
  const [application, setApplication] = useState<Application | null>(null);

  useEffect(() => {
    if (id) {
      fetchOffer();
      checkApplication();
      fetchCurrentUser();
    }
  }, [id]);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, nombre, apellidos, role')
        .eq('id', user.id)
        .single();

      if (profile) {
        setCurrentUser(profile);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  const fetchOffer = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('job_offers')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!data) throw new Error('Oferta no encontrada');
      
      setOffer(data);

      // Fetch HR profile
      if (data.created_by) {
        const { data: hrData } = await supabase
          .from('profiles')
          .select('id, nombre, apellidos, role')
          .eq('id', data.created_by)
          .single();

        if (hrData) {
          setHrProfile(hrData);
        }
      }
    } catch (err) {
      console.error('Error fetching offer:', err);
      setError('Error al cargar la oferta de trabajo');
    } finally {
      setLoading(false);
    }
  };

  const checkApplication = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('job_offer_id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      setHasApplied(!!data);
      setApplication(data);
    } catch (err) {
      console.error('Error checking application:', err);
    }
  };

  const handleApply = async () => {
    try {
      setApplying(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data, error: applicationError } = await supabase
        .from('applications')
        .insert({
          job_offer_id: id,
          user_id: user.id,
        })
        .select()
        .single();

      if (applicationError) throw applicationError;

      setSuccess(true);
      setHasApplied(true);
      if (data) {
        setApplication(data);
      }
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setError('Error al enviar la postulación');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="text-center py-10">
        <p className="text-red-600">{error || 'Oferta no encontrada'}</p>
      </div>
    );
  }

  const canMessage = hasApplied && currentUser && hrProfile && (
    (currentUser.role === 'rrhh' && application?.user_id !== currentUser.id) ||
    (currentUser.role !== 'rrhh' && application?.user_id === currentUser.id)
  );

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h1 className="text-3xl font-bold text-gray-900">{offer.titulo}</h1>
          <div className="mt-4 flex flex-wrap gap-4">
            {offer.ubicacion && (
              <div className="flex items-center text-sm text-gray-500">
                <MapPin className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                {offer.ubicacion}
              </div>
            )}
            <div className="flex items-center text-sm text-gray-500">
              <Calendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
              Publicada el {new Date(offer.fecha_publicacion).toLocaleDateString()}
              {offer.fecha_cierre && (
                <>
                  {' · '}
                  Cierra el {new Date(offer.fecha_cierre).toLocaleDateString()}
                </>
              )}
            </div>
          </div>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <div className="prose max-w-none">
            <h2 className="text-xl font-semibold mb-4">Descripción</h2>
            <div className="whitespace-pre-wrap">{offer.descripcion}</div>

            <h2 className="text-xl font-semibold mt-8 mb-4">Requisitos</h2>
            <div className="whitespace-pre-wrap">{offer.requisitos}</div>

            {offer.instrucciones_adicionales && (
              <>
                <h2 className="text-xl font-semibold mt-8 mb-4">
                  Instrucciones adicionales
                </h2>
                <div className="whitespace-pre-wrap">
                  {offer.instrucciones_adicionales}
                </div>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="px-4 py-5 sm:px-6">
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
          </div>
        )}

        {success && (
          <div className="px-4 py-5 sm:px-6">
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">
                    ¡Postulación enviada correctamente!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="px-4 py-5 sm:px-6 bg-gray-50">
          <div className="flex justify-between items-center">
            <button
              onClick={() => navigate('/job-offers')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Volver a las ofertas
            </button>
            <div className="flex items-center space-x-4">
              {canMessage && (
                <button
                  onClick={() => setShowMessages(!showMessages)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {showMessages ? 'Ocultar mensajes' : 'Mostrar mensajes'}
                </button>
              )}
              {!hasApplied && offer.estado === 'abierta' && (
                <button
                  onClick={handleApply}
                  disabled={applying}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {applying ? 'Enviando...' : 'Postularme'}
                </button>
              )}
              {hasApplied && (
                <span className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-green-700 bg-green-100">
                  Ya te has postulado
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Messages Panel */}
        {showMessages && canMessage && hrProfile && (
          <div className="px-4 py-5 sm:px-6 border-t">
            <MessagesPanel
              applicationId={application?.id}
              receiverId={currentUser.role === 'rrhh' ? application?.user_id! : hrProfile.id}
              receiverName={currentUser.role === 'rrhh' 
                ? `${currentUser.nombre} ${currentUser.apellidos}`
                : `${hrProfile.nombre} ${hrProfile.apellidos}`
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}