import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  Copy,
} from 'lucide-react';

interface EvaluationTemplate {
  id: string;
  name: string;
  description: string;
  position_type: string;
  max_score: number;
  passing_score: number;
  created_at: string;
}

interface EvaluationCriterion {
  id: string;
  template_id: string;
  name: string;
  description: string;
  weight: number;
  min_score: number;
  max_score: number;
  order_index: number;
}

export function EvaluationTemplates() {
  const [templates, setTemplates] = useState<EvaluationTemplate[]>([]);
  const [criteria, setCriteria] = useState<Record<string, EvaluationCriterion[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [newTemplate, setNewTemplate] = useState<Partial<EvaluationTemplate>>({
    name: '',
    description: '',
    position_type: '',
    max_score: 100,
    passing_score: 70,
  });
  const [newCriterion, setNewCriterion] = useState<Partial<EvaluationCriterion>>({
    name: '',
    description: '',
    weight: 1,
    min_score: 0,
    max_score: 10,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data: templatesData, error: templatesError } = await supabase
        .from('evaluation_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (templatesError) throw templatesError;
      setTemplates(templatesData || []);

      // Fetch criteria for each template
      const criteriaData: Record<string, EvaluationCriterion[]> = {};
      for (const template of templatesData || []) {
        const { data: templateCriteria, error: criteriaError } = await supabase
          .from('evaluation_criteria')
          .select('*')
          .eq('template_id', template.id)
          .order('order_index', { ascending: true });

        if (criteriaError) throw criteriaError;
        criteriaData[template.id] = templateCriteria || [];
      }
      setCriteria(criteriaData);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Error al cargar las plantillas');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from('evaluation_templates')
        .insert([newTemplate])
        .select()
        .single();

      if (error) throw error;
      setTemplates([data, ...templates]);
      setNewTemplate({
        name: '',
        description: '',
        position_type: '',
        max_score: 100,
        passing_score: 70,
      });
      setSuccess('Plantilla creada correctamente');
    } catch (err) {
      console.error('Error creating template:', err);
      setError('Error al crear la plantilla');
    }
  };

  const handleUpdateTemplate = async (templateId: string, updates: Partial<EvaluationTemplate>) => {
    try {
      const { error } = await supabase
        .from('evaluation_templates')
        .update(updates)
        .eq('id', templateId);

      if (error) throw error;
      setTemplates(templates.map(t => t.id === templateId ? { ...t, ...updates } : t));
      setEditingTemplate(null);
      setSuccess('Plantilla actualizada correctamente');
    } catch (err) {
      console.error('Error updating template:', err);
      setError('Error al actualizar la plantilla');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta plantilla?')) return;

    try {
      const { error } = await supabase
        .from('evaluation_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      setTemplates(templates.filter(t => t.id !== templateId));
      setSuccess('Plantilla eliminada correctamente');
    } catch (err) {
      console.error('Error deleting template:', err);
      setError('Error al eliminar la plantilla');
    }
  };

  const handleAddCriterion = async (templateId: string) => {
    try {
      const { data, error } = await supabase
        .from('evaluation_criteria')
        .insert([{
          ...newCriterion,
          template_id: templateId,
          order_index: (criteria[templateId]?.length || 0) + 1,
        }])
        .select()
        .single();

      if (error) throw error;
      setCriteria({
        ...criteria,
        [templateId]: [...(criteria[templateId] || []), data],
      });
      setNewCriterion({
        name: '',
        description: '',
        weight: 1,
        min_score: 0,
        max_score: 10,
      });
      setSuccess('Criterio agregado correctamente');
    } catch (err) {
      console.error('Error adding criterion:', err);
      setError('Error al agregar el criterio');
    }
  };

  const handleDeleteCriterion = async (templateId: string, criterionId: string) => {
    try {
      const { error } = await supabase
        .from('evaluation_criteria')
        .delete()
        .eq('id', criterionId);

      if (error) throw error;
      setCriteria({
        ...criteria,
        [templateId]: criteria[templateId].filter(c => c.id !== criterionId),
      });
      setSuccess('Criterio eliminado correctamente');
    } catch (err) {
      console.error('Error deleting criterion:', err);
      setError('Error al eliminar el criterio');
    }
  };

  const handleDuplicateTemplate = async (template: EvaluationTemplate) => {
    try {
      // Create new template
      const { data: newTemplate, error: templateError } = await supabase
        .from('evaluation_templates')
        .insert([{
          name: `${template.name} (copia)`,
          description: template.description,
          position_type: template.position_type,
          max_score: template.max_score,
          passing_score: template.passing_score,
        }])
        .select()
        .single();

      if (templateError) throw templateError;

      // Duplicate criteria
      const templateCriteria = criteria[template.id] || [];
      if (templateCriteria.length > 0) {
        const { error: criteriaError } = await supabase
          .from('evaluation_criteria')
          .insert(
            templateCriteria.map(criterion => ({
              template_id: newTemplate.id,
              name: criterion.name,
              description: criterion.description,
              weight: criterion.weight,
              min_score: criterion.min_score,
              max_score: criterion.max_score,
              order_index: criterion.order_index,
            }))
          );

        if (criteriaError) throw criteriaError;
      }

      fetchTemplates();
      setSuccess('Plantilla duplicada correctamente');
    } catch (err) {
      console.error('Error duplicating template:', err);
      setError('Error al duplicar la plantilla');
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
        <h2 className="text-2xl font-bold text-gray-900 mb-8">
          Plantillas de Evaluación
        </h2>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 p-4 rounded-md bg-green-50 flex items-center">
            <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
            <p className="text-sm text-green-700">{success}</p>
            <button
              onClick={() => setSuccess(null)}
              className="ml-auto text-green-500 hover:text-green-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 rounded-md bg-red-50 flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* New Template Form */}
        <div className="bg-white shadow sm:rounded-lg p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Nueva Plantilla
          </h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nombre
              </label>
              <input
                type="text"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Tipo de Posición
              </label>
              <input
                type="text"
                value={newTemplate.position_type}
                onChange={(e) => setNewTemplate({ ...newTemplate, position_type: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Descripción
              </label>
              <textarea
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Puntaje Máximo
              </label>
              <input
                type="number"
                value={newTemplate.max_score}
                onChange={(e) => setNewTemplate({ ...newTemplate, max_score: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Puntaje de Aprobación
              </label>
              <input
                type="number"
                value={newTemplate.passing_score}
                onChange={(e) => setNewTemplate({ ...newTemplate, passing_score: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleCreateTemplate}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Plantilla
            </button>
          </div>
        </div>

        {/* Templates List */}
        <div className="bg-white shadow sm:rounded-lg divide-y divide-gray-200">
          {templates.map((template) => (
            <div key={template.id} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingTemplate === template.id ? (
                    <input
                      type="text"
                      value={template.name}
                      onChange={(e) => handleUpdateTemplate(template.id, { name: e.target.value })}
                      className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  ) : (
                    template.name
                  )}
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDuplicateTemplate(template)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <Copy className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setEditingTemplate(editingTemplate === template.id ? null : template.id)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <Edit2 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="text-red-400 hover:text-red-500"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Tipo de Posición</p>
                  {editingTemplate === template.id ? (
                    <input
                      type="text"
                      value={template.position_type}
                      onChange={(e) => handleUpdateTemplate(template.id, { position_type: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{template.position_type}</p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-gray-500">Puntajes</p>
                  <p className="mt-1 text-sm text-gray-900">
                    Máximo: {template.max_score} / Aprobación: {template.passing_score}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-500">Descripción</p>
                {editingTemplate === template.id ? (
                  <textarea
                    value={template.description}
                    onChange={(e) => handleUpdateTemplate(template.id, { description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">{template.description}</p>
                )}
              </div>

              {/* Criteria List */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Criterios de Evaluación</h4>
                <div className="space-y-4">
                  {criteria[template.id]?.map((criterion) => (
                    <div
                      key={criterion.id}
                      className="flex items-center justify-between bg-gray-50 p-4 rounded-md"
                    >
                      <div className="flex-1">
                        <h5 className="text-sm font-medium text-gray-900">{criterion.name}</h5>
                        <p className="mt-1 text-sm text-gray-500">{criterion.description}</p>
                        <div className="mt-1 text-xs text-gray-500">
                          Peso: {criterion.weight} | Puntaje: {criterion.min_score}-{criterion.max_score}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteCriterion(template.id, criterion.id)}
                        className="text-red-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* New Criterion Form */}
                <div className="mt-4 bg-gray-50 p-4 rounded-md">
                  <h5 className="text-sm font-medium text-gray-900 mb-4">Agregar Criterio</h5>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Nombre
                
                      </label>
                      <input
                        type="text"
                        value={newCriterion.name}
                        onChange={(e) => setNewCriterion({ ...newCriterion, name: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Peso
                      </label>
                      <input
                        type="number"
                        value={newCriterion.weight}
                        onChange={(e) => setNewCriterion({ ...newCriterion, weight: parseInt(e.target.value) })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Descripción
                      </label>
                      <textarea
                        value={newCriterion.description}
                        onChange={(e) => setNewCriterion({ ...newCriterion, description: e.target.value })}
                        rows={2}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Puntaje Mínimo
                      </label>
                      <input
                        type="number"
                        value={newCriterion.min_score}
                        onChange={(e) => setNewCriterion({ ...newCriterion, min_score: parseInt(e.target.value) })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Puntaje Máximo
                      </label>
                      <input
                        type="number"
                        value={newCriterion.max_score}
                        onChange={(e) => setNewCriterion({ ...newCriterion, max_score: parseInt(e.target.value) })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={() => handleAddCriterion(template.id)}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Criterio
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}