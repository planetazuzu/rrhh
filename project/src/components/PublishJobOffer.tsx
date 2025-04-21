import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Save, AlertCircle } from 'lucide-react';

interface JobOfferForm {
  titulo: string;
  descripcion: string;
  ubicacion: string;
  tipo_trabajo: string;
  categoria: string;
  fecha_cierre: string;
  requisitos: string;
  instrucciones_adicionales: string;
}

const initialForm: JobOfferForm = {
  titulo: '',
  descripcion: '',
  ubicacion: '',
  tipo_trabajo: 'tiempo_completo',
  categoria: 'sanitario',
  fecha_cierre: '',
  requisitos: '',
  instrucciones_adicionales: '',
};

export function PublishJobOffer() {
  const navigate = useNavigate();
  const [form, setForm] = useState<JobOfferForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Validate form
      if (!form.titulo.trim()) {
        throw new Error('El título es obligatorio');
      }
      if (!form.descripcion.trim()) {
        throw new Error('La descripción es obligatoria');
      }
      if (!form.requisitos.trim()) {
        throw new Error('Los requisitos son obligatorios');
      }
      if (form.fecha_cierre && new Date(form.fecha_cierre) <= new Date()) {
        throw new Error('La fecha de cierre debe ser posterior a la fecha actual');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No se ha encontrado el usuario');
      }

      const { error: insertError } = await supabase
        .from('job_offers')
        .insert({
          titulo: form.titulo,
          descripcion: form.descripcion,
          ubicacion: form.ubicacion || null,
          tipo_trabajo: form.tipo_trabajo,
          categoria: form.categoria,
          fecha_cierre: form.fecha_cierre || null,
          requisitos: form.requisitos,
          instrucciones_adicionales: form.instrucciones_adicionales || null,
          created_by: user.id,
        });

      if (insertError) throw insertError;

      setSuccess(true);
      setForm(initialForm);
      setTimeout(() => {
        navigate('/job-offers');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al publicar la oferta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Publicar Oferta de Trabajo</h1>

      <form onSubmit={handleSubmit} className="space-y-8 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="space-y-6">
          <div>
            <label htmlFor="titulo" className="block text-sm font-medium text-gray-700">
              Título de la oferta *
            </label>
            <input
              type="text"
              id="titulo"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700">
              Descripción *
            </label>
            <textarea
              id="descripcion"
              rows={4}
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="ubicacion" className="block text-sm font-medium text-gray-700">
                Ubicación
              </label>
              <input
                type="text"
                id="ubicacion"
                value={form.ubicacion}
                onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="tipo_trabajo" className="block text-sm font-medium text-gray-700">
                Tipo de trabajo
              </label>
              <select
                id="tipo_trabajo"
                value={form.tipo_trabajo}
                onChange={(e) => setForm({ ...form, tipo_trabajo: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="tiempo_completo">Tiempo completo</option>
                <option value="medio_tiempo">Medio tiempo</option>
                <option value="temporal">Temporal</option>
              </select>
            </div>

            <div>
              <label htmlFor="categoria" className="block text-sm font-medium text-gray-700">
                Categoría
              </label>
              <select
                id="categoria"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="emergencias">Emergencias</option>
                <option value="sanitario">Sanitario</option>
                <option value="administrativo">Administrativo</option>
              </select>
            </div>

            <div>
              <label htmlFor="fecha_cierre" className="block text-sm font-medium text-gray-700">
                Fecha de cierre
              </label>
              <input
                type="date"
                id="fecha_cierre"
                value={form.fecha_cierre}
                onChange={(e) => setForm({ ...form, fecha_cierre: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="requisitos" className="block text-sm font-medium text-gray-700">
              Requisitos *
            </label>
            <textarea
              id="requisitos"
              rows={4}
              value={form.requisitos}
              onChange={(e) => setForm({ ...form, requisitos: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="instrucciones_adicionales" className="block text-sm font-medium text-gray-700">
              Instrucciones adicionales
            </label>
            <textarea
              id="instrucciones_adicionales"
              rows={4}
              value={form.instrucciones_adicionales}
              onChange={(e) => setForm({ ...form, instrucciones_adicionales: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        {error && (
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
        )}

        {success && (
          <div className="rounded-md bg-green-50 p-4">
            <p className="text-sm text-green-700">
              Oferta publicada correctamente. Redirigiendo...
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <Save className="h-5 w-5 mr-2" />
            {loading ? 'Publicando...' : 'Publicar oferta'}
          </button>
        </div>
      </form>
    </div>
  );
}