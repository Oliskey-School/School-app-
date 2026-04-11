import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { InspectorProfile, InspectorStats } from '../types/inspector';

export const useInspectorProfile = (inspectorId?: string) => {
  return useQuery<InspectorProfile, Error>({
    queryKey: ['inspector', 'profile', inspectorId],
    queryFn: async () => {
      if (!inspectorId) throw new Error('Inspector ID is required');
      const data = await api.getInspectorById(inspectorId);
      return data;
    },
    enabled: !!inspectorId,
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
};

export const useInspectorStats = (inspectorId?: string) => {
  return useQuery<InspectorStats, Error>({
    queryKey: ['inspector', 'stats', inspectorId],
    queryFn: async () => {
      if (!inspectorId) throw new Error('Inspector ID is required');
      
      // In a real implementation, this would be a single RPC or custom endpoint.
      // For now, we fetch inspections and compute stats if the endpoint doesn't exist.
      try {
        const stats = await api.get<InspectorStats>(`/inspectors/${inspectorId}/stats`);
        return stats;
      } catch (error) {
        console.warn('Stats endpoint failed, calculating from inspections...', error);
        const inspections = await api.getInspectionsByInspectorId(inspectorId);
        
        const completed = inspections.filter(i => i.status === 'Completed');
        const scheduled = inspections.filter(i => i.status === 'Scheduled');
        
        const uniqueSchools = new Set(inspections.map(i => i.school_id)).size;
        
        return {
          totalInspections: inspections.length,
          completedInspections: completed.length,
          scheduledInspections: scheduled.length,
          schoolsInspected: uniqueSchools,
          averageRating: 0, 
          monthlyTrends: [],
          categoryPerformance: []
        } as InspectorStats;
      }
    },
    enabled: !!inspectorId,
  });
};
