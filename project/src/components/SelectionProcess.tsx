import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  Users,
  Calendar,
  ClipboardList,
  MessageSquare,
  AlertTriangle,
  Plus,
  Briefcase,
} from 'lucide-react';

interface SelectionProcess {
  id: string;
  job_offer_id: string;
  candidate_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  start_date: string;
  end_date: string | null;
  notes: string;
  candidate: {
    nombre: string;
    apellidos: string;
  };
  job_offer: {
    titulo: string;
  };
}

interface ProcessStage {
  id: string;
  process_id: string;
  name: string;
  description: string;
  order_index: number;
  requirements: string;
  is_required: boolean;
}

interface Evaluation {
  id: string;
  stage_id: string;
  evaluator_id: string;
  score: number | null;
  feedback: string;
  status: 'pending' | 'passed' | 'failed';
  template_id: string | null;
  criteria_scores: Record<string, number>;
}

export function SelectionProcess() {
  const [processes, setProcesses] = useState<SelectionProcess[]>([]);
  const [stages, setStages] = useState<Record<string, ProcessStage[]>>({});
  const [evaluations, setEvaluations] = useState<Record<string, Evaluation[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProcess, setSelectedProcess] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);

  useEffect(() => {
    fetchProcesses();
  }, []);

  const fetchProcesses = async () => {
    try {
      const { data: processesData, error: processesError } = await supabase
        .from('selection_processes')
        .select(`
          *,
          candidate:profiles!candidate_id(nombre, apellidos),
          job_offer:job_offers(titulo)
        `)
        .order('start_date', { ascending: false });

      if (processesError) throw processesError;
      setProcesses(processesData || []);

      // Fetch stages and evaluations for each process
      for (const process of processesData || []) {
        const { data: stagesData } = await supabase
          .from('process_stages')
          .select('*')
          .eq('process_id', process.id)
          .order('order_index');

        if (stagesData) {
          setStages(prev => ({ ...prev, [process.id]: stagesData }));

          // Fetch evaluations for each stage
          const evaluationsData: Evaluation[] = [];
          for (const stage of stagesData) {
            const { data: stageEvaluations } = await supabase
              .from('candidate_evaluations')
              .select('*')
              .eq('stage_id', stage.id);

            if (stageEvaluations) {
              evaluationsData.push(...stageEvaluations);
            }
          }

          setEvaluations(prev => ({ ...prev, [process.id]: evaluationsData }));
        }
      }
    } catch (err) {
      console.error('Error fetching processes:', err);
      setError('Error al cargar los procesos de selección');
    } finally {
      setLoading(false);
    }
  };

  const handleStageUpdate = async (stageId: string, updates: Partial<ProcessStage>) => {
    try {
      const { error } = await supabase
        .from('process_stages')
        .update(updates)
        .eq('id', stageId);

      if (error) throw error;
      await fetchProcesses();
    } catch (err) {
      console.error('Error updating stage:', err);
      setError('Error al actualizar la etapa');
    }
  };

  const handleEvaluationUpdate = async (evaluationId: string, updates: Partial<Evaluation>) => {
    try {
      const { error } = await supabase
        .from('candidate_evaluations')
        .update(updates)
        .eq('id', evaluationId);

      if (error) throw error;
      await fetchProcesses();
    } catch (err) {
      console.error('Error updating evaluation:', err);
      setError('Error al actualizar la evaluación');
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedCandidates.length === 0) return;

    try {
      const updates = {
        status: bulkAction,
        ...(bulkAction === 'completed' ? { end_date: new Date().toISOString() } : {}),
      };

      const { error } = await supabase
        .from('selection_processes')
        .update(updates)
        .in('id', selectedCandidates);

      if (error) throw error;
      await fetchProcesses();
      setSelectedCandidates([]);
      setBulkAction('');
    } catch (err) {
      console.error('Error performing bulk action:', err);
      setError('Error al realizar la acción masiva');
    }
  };

  const getStageStatus = (processId: string, stageId: string) => {
    const evaluation = evaluations[processId]?.find(e => e.stage_id === stageId);
    return evaluation?.status || 'pending';
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
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Procesos de Selección
          </h2>

          {selectedCandidates.length > 0 && (
            <div className="flex items-center space-x-4">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">Seleccionar acción</option>
                <option value="in_progress">Iniciar proceso</option>
                <option value="completed">Completar proceso</option>
                <option value="rejected">Rechazar</option>
              </select>
              <button
                onClick={handleBulkAction}
                disabled={!bulkAction}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <Users className="h-4 w-4 mr-2" />
                Aplicar ({selectedCandidates.length})
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {processes.map((process) => (
              <li key={process.id}>
                <div className="block hover:bg-gray-50">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedCandidates.includes(process.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCandidates([...selectedCandidates, process.id]);
                            } else {
                              setSelectedCandidates(selectedCandidates.filter(id => id !== process.id));
                            }
                          }}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <div className="ml-4">
                          <h3 className="text-lg font-medium text-gray-900">
                            {process.candidate.nombre} {process.candidate.apellidos}
                          </h3>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            process.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : process.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : process.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {process.status === 'completed' && <CheckCircle2 className="h-4 w-4 mr-1" />}
                          {process.status === 'rejected' && <XCircle className="h-4 w-4 mr-1" />}
                          {process.status === 'in_progress' && <Clock className="h-4 w-4 mr-1" />}
                          {process.status === 'pending' && <Clock className="h-4 w-4 mr-1" />}
                          {process.status}
                        </span>
                        <button
                          onClick={() => setSelectedProcess(selectedProcess === process.id ? null : process.id)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <ChevronRight
                            className={`h-5 w-5 transform transition-transform ${
                              selectedProcess === process.id ? 'rotate-90' : ''
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          <Briefcase className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          {process.job_offer.titulo}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        <p>
                          Inicio: {new Date(process.start_date).toLocaleDateString()}
                          {process.end_date && (
                            <>
                              {' · '}
                              Fin: {new Date(process.end_date).toLocaleDateString()}
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    {selectedProcess === process.id && (
                      <div className="mt-4">
                        {/* Process Timeline */}
                        <div className="relative">
                          <div className="absolute top-0 left-4 h-full w-0.5 bg-gray-200"></div>
                          <div className="space-y-6 relative">
                            {stages[process.id]?.map((stage, index) => {
                              const stageStatus = getStageStatus(process.id, stage.id);
                              return (
                                <div key={stage.id} className="flex items-start">
                                  <div
                                    className={`relative flex items-center justify-center w-8 h-8 rounded-full ${
                                      stageStatus === 'passed'
                                        ? 'bg-green-500'
                                        : stageStatus === 'failed'
                                        ? 'bg-red-500'
                                        : 'bg-gray-300'
                                    }`}
                                  >
                                    {stageStatus === 'passed' && (
                                      <CheckCircle2 className="h-4 w-4 text-white" />
                                    )}
                                    {stageStatus === 'failed' && (
                                      <XCircle className="h-4 w-4 text-white" />
                                    )}
                                    {stageStatus === 'pending' && (
                                      <span className="text-white text-sm">
                                        {index + 1}
                                      </span>
                                    )}
                                  </div>
                                  <div className="ml-4 flex-1">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-sm font-medium text-gray-900">
                                        {stage.name}
                                      </h4>
                                      <div className="flex items-center space-x-2">
                                        <button
                                          onClick={() => {/* Add evaluation modal */}}
                                          className="text-indigo-600 hover:text-indigo-900"
                                        >
                                          <ClipboardList className="h-4 w-4" />
                                        </button>
                                        <button
                                          onClick={() => {/* Add comments modal */}}
                                          className="text-indigo-600 hover:text-indigo-900"
                                        >
                                          <MessageSquare className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>
                                    <p className="mt-1 text-sm text-gray-500">
                                      {stage.description}
                                    </p>
                                    {stage.requirements && (
                                      <div className="mt-2">
                                        <p className="text-xs font-medium text-gray-500">
                                          Requisitos:
                                        </p>
                                        <p className="mt-1 text-sm text-gray-700">
                                          {stage.requirements}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                            <button
                              onClick={() => {/* Add new stage modal */}}
                              className="flex items-center text-indigo-600 hover:text-indigo-900"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              <span className="text-sm">Agregar etapa</span>
                            </button>
                          </div>
                        </div>
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