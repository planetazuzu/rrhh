import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format, addDays, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { z } from 'zod';
import {
  FileText,
  Upload,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  History,
  Calendar,
  Download,
  Trash2,
} from 'lucide-react';

interface Document {
  id: string;
  title: string;
  type: string;
  file_url: string;
  version: number;
  status: 'pending' | 'approved' | 'rejected';
  expiry_date: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  document_versions?: {
    version: number;
    file_url: string;
    created_at: string;
  }[];
}

const documentSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  type: z.enum(['driver_license', 'emergency_title', 'other_title']),
  file: z.instanceof(File).refine((file) => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    return validTypes.includes(file.type);
  }, 'Solo se permiten archivos PDF, JPEG o PNG'),
  expiry_date: z.string().optional(),
});

export function DocumentManager() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  useEffect(() => {
    fetchDocuments();
    setupExpiryNotifications();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: fetchError } = await supabase
        .from('documents')
        .select(`
          *,
          document_versions (
            version,
            file_url,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setDocuments(data || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Error al cargar los documentos');
    } finally {
      setLoading(false);
    }
  };

  const setupExpiryNotifications = () => {
    const checkExpiryDates = () => {
      documents.forEach(doc => {
        if (doc.expiry_date) {
          const expiryDate = new Date(doc.expiry_date);
          const warningDate = addDays(new Date(), 30);
          
          if (isBefore(expiryDate, warningDate)) {
            const daysLeft = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysLeft > 0) {
              new Notification('Documento por vencer', {
                body: `${doc.title} vencerá en ${daysLeft} días`,
                icon: '/document-icon.png'
              });
            }
          }
        }
      });
    };

    if (Notification.permission === 'granted') {
      checkExpiryDates();
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          checkExpiryDates();
        }
      });
    }
  };

  const handleFileUpload = async (formData: FormData) => {
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const file = formData.get('file') as File;
      const title = formData.get('title') as string;
      const type = formData.get('type') as string;
      const expiryDate = formData.get('expiry_date') as string;

      // Validate form data
      const validatedData = documentSchema.parse({
        title,
        type,
        file,
        expiry_date: expiryDate || undefined,
      });

      // Upload file
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Create document record
      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          title: validatedData.title,
          type: validatedData.type,
          file_url: publicUrl,
          version: 1,
          status: 'pending',
          expiry_date: validatedData.expiry_date,
          user_id: user.id,
        });

      if (insertError) throw insertError;

      fetchDocuments();
    } catch (err) {
      console.error('Error uploading document:', err);
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else {
        setError('Error al subir el documento');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateDocument = async (documentId: string, file: File) => {
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const document = documents.find(d => d.id === documentId);
      if (!document) throw new Error('Documento no encontrado');

      // Upload new version
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Update document record
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          file_url: publicUrl,
          version: document.version + 1,
          status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      if (updateError) throw updateError;

      // Store previous version
      const { error: versionError } = await supabase
        .from('document_versions')
        .insert({
          document_id: documentId,
          version: document.version,
          file_url: document.file_url,
        });

      if (versionError) throw versionError;

      fetchDocuments();
    } catch (err) {
      console.error('Error updating document:', err);
      setError('Error al actualizar el documento');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (deleteError) throw deleteError;

      setDocuments(current => current.filter(d => d.id !== documentId));
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Error al eliminar el documento');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 sm:px-0">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Gestión de Documentos</h2>

        {/* Upload Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleFileUpload(new FormData(e.currentTarget));
          }}
          className="bg-white shadow sm:rounded-lg p-6 mb-8"
        >
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Título del documento
              </label>
              <input
                type="text"
                name="title"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Tipo de documento
              </label>
              <select
                name="type"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="driver_license">Carnet de conducir</option>
                <option value="emergency_title">Título de emergencias</option>
                <option value="other_title">Otro título</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Archivo
              </label>
              <input
                type="file"
                name="file"
                accept=".pdf,.jpg,.jpeg,.png"
                required
                className="mt-1 block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-medium
                  file:bg-indigo-50 file:text-indigo-700
                  hover:file:bg-indigo-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Fecha de vencimiento
              </label>
              <input
                type="date"
                name="expiry_date"
                min={new Date().toISOString().split('T')[0]}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={uploading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {uploading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Subir documento
            </button>
          </div>
        </form>

        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-8">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Documents List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <ul className="divide-y divide-gray-200">
            {documents.map((document) => (
              <li key={document.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="h-8 w-8 text-gray-400" />
                    <div className="ml-4">
                      <h4 className="text-lg font-medium text-gray-900">
                        {document.title}
                      </h4>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                        <span>Versión {document.version}</span>
                        <span>•</span>
                        <span>
                          {format(new Date(document.created_at), 'dd/MM/yyyy', { locale: es })}
                        </span>
                        {document.expiry_date && (
                          <>
                            <span>•</span>
                            <span className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              Vence: {format(new Date(document.expiry_date), 'dd/MM/yyyy', { locale: es })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        document.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : document.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {document.status === 'approved' && <CheckCircle className="h-4 w-4 mr-1" />}
                      {document.status === 'rejected' && <XCircle className="h-4 w-4 mr-1" />}
                      {document.status === 'pending' && <Clock className="h-4 w-4 mr-1" />}
                      {document.status === 'approved' ? 'Aprobado' :
                       document.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                    </span>

                    <button
                      onClick={() => setShowHistory(showHistory === document.id ? null : document.id)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <History className="h-5 w-5" />
                    </button>

                    <a
                      href={document.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      <Download className="h-5 w-5" />
                    </a>

                    <button
                      onClick={() => handleDeleteDocument(document.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Version History */}
                {showHistory === document.id && document.document_versions && (
                  <div className="mt-4 pl-12">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">
                      Historial de versiones
                    </h5>
                    <ul className="space-y-2">
                      {document.document_versions.map((version) => (
                        <li
                          key={version.version}
                          className="flex items-center justify-between text-sm text-gray-500"
                        >
                          <span>Versión {version.version}</span>
                          <div className="flex items-center space-x-2">
                            <span>
                              {format(new Date(version.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                            </span>
                            <a
                              href={version.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Update Document */}
                <div className="mt-4 pl-12">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleUpdateDocument(document.id, e.target.files[0]);
                      }
                    }}
                    className="text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-medium
                      file:bg-indigo-50 file:text-indigo-700
                      hover:file:bg-indigo-100"
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}