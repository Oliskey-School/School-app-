
import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAutoSync } from '../../hooks/useAutoSync';
import { getCurriculum } from '../../curriculumData';
import { CurriculumSubject, CurriculumSubjectCategory, Department } from '../../types';
import { BookOpenIcon } from '../../constants';
import { fetchSubjects } from '../../lib/database';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const categoryStyles: { [key in CurriculumSubjectCategory]: string } = {
  Core: 'bg-sky-100 text-sky-800',
  Compulsory: 'bg-purple-100 text-purple-800',
  Elective: 'bg-green-100 text-green-800',
  'Pre-Vocational Electives': 'bg-amber-100 text-amber-800',
  'Other Electives': 'bg-indigo-100 text-indigo-800',
  'Foundational Play-Based Learning': 'bg-rose-100 text-rose-800',
  'Core Foundational': 'bg-teal-100 text-teal-800',
  'Pre-Primary Core': 'bg-fuchsia-100 text-fuchsia-800',
};

const CategoryBadge: React.FC<{ category: CurriculumSubjectCategory }> = ({ category }) => {
  const style = categoryStyles[category] || 'bg-gray-100 text-gray-800';
  return <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${style}`}>{category}</span>;
};

interface CurriculumScreenProps {
  level: string; // e.g., "Primary 1", "JSS 2", "SSS 1"
  department?: Department;
}

const CurriculumScreen: React.FC<CurriculumScreenProps> = ({ level, department }) => {
  const [dbSubjects, setDbSubjects] = useState<CurriculumSubject[]>([]);
  const [loading, setLoading] = useState(true);

  const { currentSchool } = useAuth();

  const loadSubjects = useCallback(async () => {
    if (!currentSchool) return;
    setLoading(true);
    try {
      // Try to find subjects in the DB matching this school
      const data = await api.getSubjects(currentSchool.id);
      
      // Filter locally for the specific level (if the API doesn't support it yet)
      const filteredData = data.filter((s: any) => 
        s.grade_level_category === level && s.is_active !== false
      );

      if (filteredData && filteredData.length > 0) {
        setDbSubjects(filteredData.map((s: any) => ({
          name: s.name,
          category: (s.category as CurriculumSubjectCategory) || 'Core'
        })));
      } else {
        setDbSubjects([]);
      }
    } catch (err) {
      console.error('Error fetching curriculum subjects:', err);
    } finally {
      setLoading(false);
    }
  }, [level, currentSchool]);

  // Real-time synchronization
  useAutoSync(['subjects'], loadSubjects);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  const subjects = useMemo(() => {
    if (dbSubjects.length > 0) return dbSubjects;
    // Fallback to static curriculum data
    return getCurriculum(level, department);
  }, [level, department, dbSubjects]);

  const groupedSubjects = useMemo(() => {
    return subjects.reduce((acc, subject) => {
      const category = subject.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(subject);
      return acc;
    }, {} as { [key in CurriculumSubjectCategory]?: CurriculumSubject[] });
  }, [subjects]);

  const categoryOrder: CurriculumSubjectCategory[] = [
    'Foundational Play-Based Learning', 'Core Foundational', 'Pre-Primary Core',
    'Compulsory', 'Core', 'Pre-Vocational Electives', 'Elective', 'Other Electives'
  ];

  if (loading && dbSubjects.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-3" />
            <p className="text-gray-400 text-sm font-medium">Loading curriculum...</p>
        </div>
    );
  }

  return (
    <div className="p-4 space-y-5 bg-gray-50">
      {Object.keys(groupedSubjects).length === 0 ? (
        <div className="text-center py-10 bg-white rounded-lg shadow-sm">
          <BookOpenIcon className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Curriculum Found</h3>
          <p className="mt-1 text-sm text-gray-500">Could not find subjects for the selected level ({level}).</p>
        </div>
      ) : (
        categoryOrder.map((category, catIdx) => {
          if (!groupedSubjects[category]) return null;

          return (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(catIdx, 8) * 0.06 }}
              whileHover={{ y: -2 }}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100"
            >
              <div className="p-4 border-b border-gray-200 bg-gray-50/50">
                <CategoryBadge category={category} />
              </div>
              <div className="divide-y divide-gray-100">
                {groupedSubjects[category]!.map((subject, i) => (
                  <motion.div
                    key={subject.name}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(i, 10) * 0.03 }}
                    className="px-4 py-3 flex items-center hover:bg-gray-50 transition-colors"
                  >
                    <p className="font-medium text-gray-800">{subject.name}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          );
        })
      )}
    </div>
  );
};

export default CurriculumScreen;