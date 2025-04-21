import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Briefcase,
  MessageSquare,
  History,
  BarChart,
  FileText,
  ClipboardList,
  GitMerge,
  User,
  Plus,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface MenuItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
  role?: 'all' | 'rrhh';
  action?: () => void;
}

export function Home() {
  const navigate = useNavigate();
  const [userRole, setUserRole] = React.useState<string | null>(null);

  React.useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    setUserRole(profile?.role || null);
  };

  const menuItems: MenuItem[] = [
    {
      title: 'Mi Perfil',
      description: 'Gestiona tu información personal y documentos',
      icon: <User className="h-8 w-8" />,
      path: '/profile',
      color: 'bg-blue-500',
      role: 'all',
    },
    {
      title: 'Documentos',
      description: 'Gestiona tus documentos y certificaciones',
      icon: <FileText className="h-8 w-8" />,
      path: '/documents',
      color: 'bg-purple-500',
      role: 'all',
    },
    {
      title: 'Ofertas de Trabajo',
      description: 'Explora las ofertas de trabajo disponibles',
      icon: <Briefcase className="h-8 w-8" />,
      path: '/job-offers',
      color: 'bg-green-500',
      role: 'all',
    },
    {
      title: 'Postulaciones',
      description: 'Revisa el estado de tus postulaciones',
      icon: <MessageSquare className="h-8 w-8" />,
      path: '/applications',
      color: 'bg-yellow-500',
      role: 'all',
    },
    {
      title: 'Dashboard',
      description: 'Visualiza estadísticas y métricas',
      icon: <BarChart className="h-8 w-8" />,
      path: '/dashboard',
      color: 'bg-indigo-500',
      role: 'rrhh',
    },
    {
      title: 'Gestión de Candidatos',
      description: 'Administra los perfiles de candidatos',
      icon: <Users className="h-8 w-8" />,
      path: '/admin',
      color: 'bg-red-500',
      role: 'rrhh',
    },
    {
      title: 'Plantillas de Evaluación',
      description: 'Configura plantillas para evaluar candidatos',
      icon: <ClipboardList className="h-8 w-8" />,
      path: '/admin/evaluation-templates',
      color: 'bg-teal-500',
      role: 'rrhh',
    },
    {
      title: 'Procesos de Selección',
      description: 'Gestiona los procesos de selección activos',
      icon: <GitMerge className="h-8 w-8" />,
      path: '/admin/selection-process',
      color: 'bg-orange-500',
      role: 'rrhh',
    },
    {
      title: 'Historial de Actividad',
      description: 'Revisa el historial de acciones',
      icon: <History className="h-8 w-8" />,
      path: '/activity',
      color: 'bg-pink-500',
      role: 'rrhh',
    },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.role === 'all' || (item.role === 'rrhh' && userRole === 'rrhh')
  );

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Sistema de Gestión de Candidatos
        </h1>
        <p className="text-xl text-gray-600">
          Bienvenido al portal de gestión de recursos humanos
        </p>
        {userRole === 'rrhh' && (
          <button
            onClick={() => navigate('/admin/publish-job')}
            className="mt-6 inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-5 w-5 mr-2" />
            Crear Nueva Oferta de Trabajo
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredMenuItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="relative group bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 text-left"
          >
            <div className={`absolute top-0 left-0 w-2 h-full ${item.color} rounded-l-lg`} />
            <div className={`inline-flex items-center justify-center p-3 ${item.color} rounded-lg text-white mb-4`}>
              {item.icon}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {item.title}
            </h3>
            <p className="text-sm text-gray-500">
              {item.description}
            </p>
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className={`${item.color} text-white rounded-full p-2`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}