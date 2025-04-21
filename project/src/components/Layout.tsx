import React, { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  LogOut,
  User,
  Briefcase,
  MessageSquare,
  History,
  BarChart,
  FileText,
  ClipboardList,
  GitMerge,
  Home,
} from 'lucide-react';
import { NotificationsPanel } from './NotificationsPanel';

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, [location.pathname]);

  const checkAuth = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        setError('Session error');
        navigate('/auth');
        return;
      }

      if (!session && location.pathname !== '/auth') {
        navigate('/auth');
        return;
      }

      if (session?.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Profile error:', profileError);
          setError('Error fetching user profile');
          return;
        }

        setUserRole(profile?.role || null);

        // Redirect based on role if on restricted pages
        const adminRoutes = ['/admin', '/dashboard', '/activity', '/admin/evaluation-templates', '/admin/selection-process'];
        if (profile?.role !== 'rrhh' && adminRoutes.some(route => location.pathname.startsWith(route))) {
          navigate('/');
        }
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred');
      navigate('/auth');
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/auth');
    } catch (err) {
      console.error('Sign out error:', err);
      setError('Error signing out');
    }
  };

  if (location.pathname === '/auth') {
    return <Outlet />;
  }

  const menuItems = [
    {
      to: '/profile',
      icon: <User className="h-4 w-4 mr-2" />,
      text: 'Mi Perfil',
      role: 'all',
    },
    {
      to: '/documents',
      icon: <FileText className="h-4 w-4 mr-2" />,
      text: 'Documentos',
      role: 'all',
    },
    {
      to: '/job-offers',
      icon: <Briefcase className="h-4 w-4 mr-2" />,
      text: 'Ofertas',
      role: 'all',
    },
    {
      to: '/applications',
      icon: <MessageSquare className="h-4 w-4 mr-2" />,
      text: 'Postulaciones',
      role: 'all',
    },
    {
      to: '/dashboard',
      icon: <BarChart className="h-4 w-4 mr-2" />,
      text: 'Dashboard',
      role: 'rrhh',
    },
    {
      to: '/admin',
      icon: <User className="h-4 w-4 mr-2" />,
      text: 'Candidatos',
      role: 'rrhh',
    },
    {
      to: '/admin/evaluation-templates',
      icon: <ClipboardList className="h-4 w-4 mr-2" />,
      text: 'Evaluaciones',
      role: 'rrhh',
    },
    {
      to: '/admin/selection-process',
      icon: <GitMerge className="h-4 w-4 mr-2" />,
      text: 'Procesos',
      role: 'rrhh',
    },
    {
      to: '/activity',
      icon: <History className="h-4 w-4 mr-2" />,
      text: 'Actividad',
      role: 'rrhh',
    },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.role === 'all' || item.role === userRole
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <User className="h-8 w-8 text-indigo-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">
                  {userRole === 'rrhh' ? 'Portal RRHH' : 'Portal Candidatos'}
                </span>
              </Link>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  to="/"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Inicio
                </Link>
                {filteredMenuItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      location.pathname === item.to ? 'border-indigo-500 text-indigo-600' : ''
                    }`}
                  >
                    {item.icon}
                    {item.text}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <NotificationsPanel />
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}