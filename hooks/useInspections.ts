import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Inspection, InspectionItem, InspectionTemplate } from '../types/inspector';

export const useInspections = (inspectorId?: string) => {
  return useQuery<Inspection[], Error>({
    queryKey: ['inspections', 'list', inspectorId],
    queryFn: async () => {
      if (!inspectorId) return [];
      return await api.getInspectionsByInspectorId(inspectorId);
    },
    enabled: !!inspectorId,
  });
};

export const useInspection = (inspectionId?: string) => {
  return useQuery<Inspection, Error>({
    queryKey: ['inspections', 'detail', inspectionId],
    queryFn: async () => {
      if (!inspectionId) throw new Error('Inspection ID is required');
      const data = await api.getInspectionById(inspectionId);
      
      // Fetch items if not included in detail
      if (data && !data.items) {
        const items = await api.from('inspection_items').eq('inspection_id', inspectionId).select('*');
        data.items = items.data || [];
      }
      
      return data;
    },
    enabled: !!inspectionId,
  });
};

export const useCreateInspection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Inspection>) => api.createInspection(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inspections', 'list', variables.inspector_id] });
    },
  });
};

export const useUpdateInspection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Inspection> }) => api.updateInspection(id, data),
    onSuccess: (updatedData) => {
      queryClient.invalidateQueries({ queryKey: ['inspections', 'detail', updatedData.id] });
      queryClient.invalidateQueries({ queryKey: ['inspections', 'list'] });
    },
  });
};

export const useSubmitInspectionResponses = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (responses: Partial<InspectionItem>[]) => api.submitInspectionResponses(responses),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections', 'detail'] });
    },
  });
};

export const useInspectionTemplate = (type: string) => {
  return useQuery<InspectionTemplate, Error>({
    queryKey: ['inspection_templates', type],
    queryFn: () => api.getInspectionTemplate(type),
    enabled: !!type && type !== 'new',
  });
};

export const useSubmitInspectionFull = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.submitInspectionFull(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
    },
  });
};
