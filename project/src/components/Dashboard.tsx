import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  BarChart as BarChartIcon, 
  TrendingUp, 
  Users, 
  Briefcase,
  Download,
  Calendar,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

interface DashboardStats {
  totalCandidates: number;
  activeOffers: number;
  totalApplications: number;
  acceptanceRate: number;
  monthlyApplications: {
    month: string;
    total: number;
    accepted: number;
    rejected: number;
    pending: number;
  }[];
  categoryDistribution: {
    category: string;
    count: number;
  }[];
  locationDistribution: {
    location: string;
    count: number;
  }[];
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCandidates: 0,
    activeOffers: 0,
    totalApplications: 0,
    acceptanceRate: 0,
    monthlyApplications: [],
    categoryDistribution: [],
    locationDistribution: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch total candidates
      const { count: candidatesCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .eq('role', 'candidato');

      // Fetch active offers
      const { count: activeOffersCount } = await supabase
        .from('job_offers')
        .select('*', { count: 'exact' })
        .eq('estado', 'abierta');

      // Fetch applications statistics
      const { data: applications } = await supabase
        .from('applications')
        .select('*');

      const totalApplications = applications?.length || 0;
      const acceptedApplications = applications?.filter(a => a.estado === 'aceptada').length || 0;
      const acceptanceRate = totalApplications > 0 
        ? (acceptedApplications / totalApplications) * 100 
        : 0;

      // Fetch monthly applications for the last 6 months
      const monthlyStats = [];
      for (let i = 0; i < 6; i++) {
        const monthStart = startOfMonth(subMonths(new Date(), i));
        const monthEnd = endOfMonth(subMonths(new Date(), i));
        
        const monthlyApplications = applications?.filter(a => {
          const applicationDate = new Date(a.fecha_postulacion);
          return applicationDate >= monthStart && applicationDate <= monthEnd;
        }) || [];

        monthlyStats.push({
          month: format(monthStart, 'MMM yyyy', { locale: es }),
          total: monthlyApplications.length,
          accepted: monthlyApplications.filter(a => a.estado === 'aceptada').length,
          rejected: monthlyApplications.filter(a => a.estado === 'rechazada').length,
          pending: monthlyApplications.filter(a => a.estado === 'pendiente').length,
        });
      }

      // Fetch category distribution
      const { data: jobOffers } = await supabase
        .from('job_offers')
        .select('categoria');

      const categoryCount = jobOffers?.reduce((acc, offer) => {
        acc[offer.categoria] = (acc[offer.categoria] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const categoryDistribution = Object.entries(categoryCount || {}).map(([category, count]) => ({
        category,
        count,
      }));

      // Fetch location distribution
      const locationCount = jobOffers?.reduce((acc, offer) => {
        if (offer.ubicacion) {
          acc[offer.ubicacion] = (acc[offer.ubicacion] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const locationDistribution = Object.entries(locationCount || {}).map(([location, count]) => ({
        location,
        count,
      }));

      setStats({
        totalCandidates: candidatesCount || 0,
        activeOffers: activeOffersCount || 0,
        totalApplications,
        acceptanceRate,
        monthlyApplications: monthlyStats.reverse(),
        categoryDistribution,
        locationDistribution,
      });
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError('Error al cargar las estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      statistics: {
        totalCandidates: stats.totalCandidates,
        activeOffers: stats.activeOffers,
        totalApplications: stats.totalApplications,
        acceptanceRate: stats.acceptanceRate.toFixed(2) + '%',
      },
      monthlyApplications: stats.monthlyApplications,
      categoryDistribution: stats.categoryDistribution,
      locationDistribution: stats.locationDistribution,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte-rrhh-${format(new Date(), 'dd-MM-yyyy')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard RRHH</h1>
          <button
            onClick={exportReport}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Download className="h-5 w-5 mr-2" />
            Exportar Reporte
          </button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Candidatos
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalCandidates}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Briefcase className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Ofertas Activas
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.activeOffers}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BarChartIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Postulaciones
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalApplications}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Tasa de Aceptación
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.acceptanceRate.toFixed(2)}%
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Applications Chart */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Postulaciones Mensuales
          </h2>
          <div className="relative">
            <div className="flex -mx-2 overflow-x-auto">
              {stats.monthlyApplications.map((month) => (
                <div key={month.month} className="px-2 min-w-[120px]">
                  <div className="flex flex-col items-center">
                    <div className="w-full h-32 flex flex-col justify-end space-y-1">
                      <div 
                        style={{ height: `${(month.accepted / month.total) * 100}%` }}
                        className="bg-green-200 w-full rounded-t"
                      />
                      <div 
                        style={{ height: `${(month.rejected / month.total) * 100}%` }}
                        className="bg-red-200 w-full"
                      />
                      <div 
                        style={{ height: `${(month.pending / month.total) * 100}%` }}
                        className="bg-yellow-200 w-full rounded-b"
                      />
                    </div>
                    <div className="mt-2 text-sm text-gray-600">{month.month}</div>
                    <div className="mt-1 text-xs text-gray-500">Total: {month.total}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-center space-x-4">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-200 rounded mr-2" />
                <span className="text-sm text-gray-600">Aceptadas</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-200 rounded mr-2" />
                <span className="text-sm text-gray-600">Rechazadas</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-200 rounded mr-2" />
                <span className="text-sm text-gray-600">Pendientes</span>
              </div>
            </div>
          </div>
        </div>

        {/* Distribution Charts */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Distribución por Categoría
            </h2>
            <div className="space-y-4">
              {stats.categoryDistribution.map(({ category, count }) => (
                <div key={category}>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>{category}</span>
                    <span>{count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full"
                      style={{
                        width: `${(count / stats.activeOffers) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Distribución por Ubicación
            </h2>
            <div className="space-y-4">
              {stats.locationDistribution.map(({ location, count }) => (
                <div key={location}>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>{location}</span>
                    <span>{count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full"
                      style={{
                        width: `${(count / stats.activeOffers) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}