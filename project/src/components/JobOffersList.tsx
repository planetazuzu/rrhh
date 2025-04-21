import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Briefcase, MapPin, Calendar, ChevronRight, Search, Filter, ChevronLeft } from 'lucide-react';

interface JobOffer {
  id: string;
  titulo: string;
  ubicacion: string | null;
  fecha_publicacion: string;
  fecha_cierre: string | null;
  estado: string;
  tipo_trabajo: string;
  categoria: string;
}

interface Filters {
  ubicacion: string;
  tipo_trabajo: string;
  categoria: string;
  solo_activas: boolean;
}

const ITEMS_PER_PAGE = 10;

export function JobOffersList() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOffers, setTotalOffers] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    ubicacion: '',
    tipo_trabajo: '',
    categoria: '',
    solo_activas: true,
  });

  const totalPages = Math.ceil(totalOffers / ITEMS_PER_PAGE);

  useEffect(() => {
    fetchOffers();
  }, [currentPage, filters]);

  const fetchOffers = async () => {
    try {
      let query = supabase
        .from('job_offers')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.ubicacion) {
        query = query.ilike('ubicacion', `%${filters.ubicacion}%`);
      }
      if (filters.tipo_trabajo) {
        query = query.eq('tipo_trabajo', filters.tipo_trabajo);
      }
      if (filters.categoria) {
        query = query.eq('categoria', filters.categoria);
      }
      if (filters.solo_activas) {
        query = query.eq('estado', 'abierta');
      }

      // Add pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      const { data, count, error: fetchError } = await query
        .order('fecha_publicacion', { ascending: false })
        .range(from, to);

      if (fetchError) throw fetchError;
      setOffers(data || []);
      setTotalOffers(count || 0);
    } catch (err) {
      console.error('Error fetching offers:', err);
      setError('Error al cargar las ofertas de trabajo');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      ubicacion: '',
      tipo_trabajo: '',
      categoria: '',
      solo_activas: true,
    });
    setCurrentPage(1);
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Ofertas de Trabajo</h1>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Filter className="h-5 w-5 mr-2" />
            {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Ubicación
                </label>
                <input
                  type="text"
                  name="ubicacion"
                  value={filters.ubicacion}
                  onChange={handleFilterChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Cualquier ubicación"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tipo de trabajo
                </label>
                <select
                  name="tipo_trabajo"
                  value={filters.tipo_trabajo}
                  onChange={handleFilterChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Todos</option>
                  <option value="tiempo_completo">Tiempo completo</option>
                  <option value="medio_tiempo">Medio tiempo</option>
                  <option value="temporal">Temporal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Categoría
                </label>
                <select
                  name="categoria"
                  value={filters.categoria}
                  onChange={handleFilterChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Todas</option>
                  <option value="emergencias">Emergencias</option>
                  <option value="sanitario">Sanitario</option>
                  <option value="administrativo">Administrativo</option>
                </select>
              </div>

              <div className="flex items-center">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    name="solo_activas"
                    checked={filters.solo_activas}
                    onChange={handleFilterChange}
                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 mr-2"
                  />
                  Solo ofertas activas
                </label>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 mr-3"
              >
                Limpiar filtros
              </button>
              <button
                onClick={() => fetchOffers()}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </button>
            </div>
          </div>
        )}

        {/* Job Offers List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {offers.map((offer) => (
              <li key={offer.id}>
                <div className="block hover:bg-gray-50">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Briefcase className="h-5 w-5 text-gray-400" />
                        <p className="ml-2 text-sm font-medium text-indigo-600 truncate">
                          {offer.titulo}
                        </p>
                      </div>
                      <div className="ml-2 flex-shrink-0 flex">
                        <button
                          onClick={() => navigate(`/job-offers/${offer.id}`)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                        >
                          Ver detalles
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        {offer.ubicacion && (
                          <p className="flex items-center text-sm text-gray-500">
                            <MapPin className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                            {offer.ubicacion}
                          </p>
                        )}
                        {offer.tipo_trabajo && (
                          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                            <Briefcase className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                            {offer.tipo_trabajo.replace('_', ' ')}
                          </p>
                        )}
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        <p>
                          Publicada el{' '}
                          {new Date(offer.fecha_publicacion).toLocaleDateString()}
                          {offer.fecha_cierre && (
                            <>
                              {' · '}
                              Cierra el{' '}
                              {new Date(offer.fecha_cierre).toLocaleDateString()}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando{' '}
                  <span className="font-medium">
                    {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalOffers)}
                  </span>{' '}
                  a{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * ITEMS_PER_PAGE, totalOffers)}
                  </span>{' '}
                  de{' '}
                  <span className="font-medium">{totalOffers}</span>{' '}
                  resultados
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="sr-only">Anterior</span>
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === i + 1
                          ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="sr-only">Siguiente</span>
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}