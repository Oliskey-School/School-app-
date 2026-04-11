import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { School } from '../types';
import { SchoolFilter, SchoolProfile } from '../types/inspector';

export const useSchoolsInJurisdiction = (jurisdictionIds: string[]) => {
  return useQuery<School[], Error>({
    queryKey: ['schools', 'jurisdiction', jurisdictionIds],
    queryFn: async () => {
      if (!jurisdictionIds || jurisdictionIds.length === 0) return [];
      
      // If jurisdictionIds are school IDs, we can use 'in' filter
      // If they are region/LGA codes, we should use a different filter
      try {
        const { data } = await api.from('schools')
          .select('*')
          .in('id', jurisdictionIds);
        return data || [];
      } catch (error) {
        console.error('Error fetching schools in jurisdiction:', error);
        return [];
      }
    },
    enabled: jurisdictionIds.length > 0,
  });
};

export const useSearchSchools = (searchTerm: string) => {
  return useQuery<School[], Error>({
    queryKey: ['schools', 'search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      const { data } = await api.from('schools')
        .select('*')
        .ilike('name', `%${searchTerm}%`)
        .limit(10);
      return data || [];
    },
    enabled: searchTerm.length >= 2,
  });
};

export const useSchoolsDirectory = (jurisdictionIds: string[], filters: SchoolFilter) => {
  return useQuery<SchoolProfile[], Error>({
    queryKey: ['schools', 'directory', jurisdictionIds, filters],
    queryFn: async () => {
      // Use the new enhanced API method
      const data = await api.getSchoolsEnhanced(jurisdictionIds, filters);
      return data || [];
    },
    enabled: jurisdictionIds.length > 0,
  });
};

export const useSchoolProfile = (schoolId?: string) => {
  return useQuery<SchoolProfile, Error>({
    queryKey: ['school', 'profile', schoolId],
    queryFn: async () => {
      if (!schoolId) throw new Error('School ID is required');
      const data = await api.getSchoolProfileData(schoolId);
      return data;
    },
    enabled: !!schoolId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
