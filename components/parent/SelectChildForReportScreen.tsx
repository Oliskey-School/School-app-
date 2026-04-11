import React, { useState, useEffect, useCallback } from 'react';
import { useAutoSync } from '../../hooks/useAutoSync';
import { api } from '../../lib/api';
import { Student } from '../../types';
import { ChevronRightIcon, ReportIcon } from '../../constants';

interface SelectChildForReportScreenProps {
  navigateTo: (view: string, title: string, props?: any) => void;
  parentId?: string | null;
  currentUserId?: string | null; // Added
  schoolId?: string;
}

const SelectChildForReportScreen: React.FC<SelectChildForReportScreenProps> = ({ navigateTo, parentId, currentUserId, schoolId }) => {
  const [children, setChildren] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChildren = useCallback(async () => {
    try {
      const data = await api.getMyChildren();
      if (data) {
        const mappedStudents = data.map((s: any) => ({
          id: s.id,
          name: s.name || s.full_name || 'Unknown Student',
          avatarUrl: s.avatar_url,
          grade: s.grade || s.class?.name || '',
          section: s.section || ''
        } as Student));
        setChildren(mappedStudents);
      }
    } catch (err) {
      console.error("Error fetching children for report:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Real-time synchronization
  useAutoSync(['student_parent_links', 'students'], fetchChildren);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  if (loading) return <div className="p-8 text-center">Loading children...</div>;

  const handleSelectChild = (student: Student) => {
    navigateTo('reportCard', `${student.name}'s Report`, { student });
  };

  return (
    <div className="p-4 space-y-4 bg-gray-50 h-full">
      <div className="bg-green-50 p-4 rounded-xl text-center border border-green-200">
        <ReportIcon className="h-10 w-10 mx-auto text-green-400 mb-2" />
        <h3 className="font-bold text-lg text-green-800">Select a Child</h3>
        <p className="text-sm text-green-700">Choose a child to view their latest academic report card.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children.map(child => (
          <button
            key={child.id}
            onClick={() => handleSelectChild(child)}
            className="w-full bg-white rounded-xl shadow-sm p-4 flex items-center justify-between text-left hover:bg-gray-50 hover:ring-2 hover:ring-green-200 transition-all"
          >
            <div className="flex items-center space-x-4">
              {child.avatarUrl ? (
                <img src={child.avatarUrl} alt={child.name} className="w-14 h-14 rounded-full object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xl">
                  {child.name.charAt(0)}
                </div>
              )}
              <div>
                <p className="font-bold text-gray-800">{child.name}</p>
                <p className="text-sm text-gray-600">Grade {child.grade}{child.section}</p>
              </div>
            </div>
            <ChevronRightIcon className="text-gray-400" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default SelectChildForReportScreen;