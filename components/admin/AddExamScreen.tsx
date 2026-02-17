
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Exam } from '../../types';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface AddExamScreenProps {
  onSave: (exam: Omit<Exam, 'id' | 'isPublished' | 'teacherId'>) => void;
  examToEdit?: Exam | null;
}

const AddExamScreen: React.FC<AddExamScreenProps> = ({ onSave, examToEdit }) => {
  const { currentSchool } = useAuth();
  const [examType, setExamType] = useState('');
  const [date, setDate] = useState('');
  const [className, setClassName] = useState('');
  const [subject, setSubject] = useState('');
  
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFormData = async () => {
      if (!currentSchool?.id) return;
      setLoading(true);
      try {
        const [classesRes, subjectsRes] = await Promise.all([
          supabase.from('classes').select('name').eq('school_id', currentSchool.id).order('name'),
          supabase.from('subjects').select('name').eq('is_active', true).order('name')
        ]);

        if (classesRes.data) setAvailableClasses(classesRes.data);
        if (subjectsRes.data) setAvailableSubjects(subjectsRes.data);
      } catch (err) {
        console.error('Error fetching exam form data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFormData();

    if (examToEdit) {
      setExamType(examToEdit.type);
      setDate(examToEdit.date);
      setClassName(examToEdit.className);
      setSubject(examToEdit.subject);
    }
  }, [examToEdit, currentSchool?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (examType && date && className && subject) {
      onSave({ type: examType, date, className, subject });
    } else {
      toast.error('Please fill all fields.');
    }
  };

  const examTypes = ['Mid-term', 'Final', 'Quiz', 'Test', 'Assessment', 'WAEC', 'NECO', 'IGCSE', 'CHECKPOINT'];

  if (loading && availableClasses.length === 0) {
    return <div className="p-8 text-center text-gray-500">Loading form data...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <form onSubmit={handleSubmit} className="flex-grow flex flex-col">
        <main className="flex-grow p-4 space-y-4 overflow-y-auto">
          <div className="space-y-4 bg-white p-4 rounded-xl shadow-sm">
            <div>
              <label htmlFor="examType" className="block text-sm font-medium text-gray-700 mb-1">Exam Type</label>
              <select id="examType" value={examType} onChange={e => setExamType(e.target.value)} required className="w-full px-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500">
                <option value="" disabled>Select type...</option>
                {examTypes.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full px-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500" />
            </div>
            <div>
              <label htmlFor="className" className="block text-sm font-medium text-gray-700 mb-1">Class</label>
              <select id="className" value={className} onChange={e => setClassName(e.target.value)} required className="w-full px-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500">
                <option value="" disabled>Select class...</option>
                {availableClasses.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                {availableClasses.length === 0 && <option value="" disabled>No classes found in database</option>}
              </select>
            </div>
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <select id="subject" value={subject} onChange={e => setSubject(e.target.value)} required className="w-full px-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500">
                <option value="" disabled>Select subject...</option>
                {availableSubjects.map(sub => <option key={sub.name} value={sub.name}>{sub.name}</option>)}
              </select>
            </div>
          </div>
        </main>
        <div className="p-4 mt-auto bg-gray-50 border-t border-gray-200">
          <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm font-medium text-white bg-sky-500 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500">
            {examToEdit ? 'Update Exam' : 'Save Exam'}
          </button>
        </div>
      </form>
    </div>
  );
};
export default AddExamScreen;
