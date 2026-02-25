import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { BookOpenIcon, SaveIcon, ChevronRightIcon } from '../../constants';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const Accordion: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4 text-left font-bold text-gray-800">
        <span>{title}</span>
        <ChevronRightIcon className={`transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      {isOpen && <div className="p-4 border-t">{children}</div>}
    </div>
  );
};

const AcademicSettingsScreen: React.FC = () => {
  const { currentSchool, user } = useAuth();
  const schoolId = currentSchool?.id || user?.user_metadata?.school_id;

  const [calendar, setCalendar] = useState({ start: '2024-09-05', end: '2025-06-20' });
  const [grading, setGrading] = useState({ scale: 'percentage', weighted: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!schoolId) return;
      setLoading(true);
      try {
        const { data: calendarData } = await supabase.from('system_settings').select('value').eq('school_id', schoolId).eq('key', 'academic_calendar').maybeSingle();
        const { data: gradingData } = await supabase.from('system_settings').select('value').eq('school_id', schoolId).eq('key', 'grading_config').maybeSingle();

        if (calendarData) setCalendar(calendarData.value);
        if (gradingData) setGrading(gradingData.value);
      } catch (err) {
        console.error('Failed to load settings:', err);
        toast.error('Error loading academic settings.');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [schoolId]);

  const saveSettings = async () => {
    if (!schoolId) {
      toast.error("School context missing.");
      return;
    }
    setSaving(true);
    try {
      const { error: calErr } = await supabase.from('system_settings').upsert({ school_id: schoolId, key: 'academic_calendar', value: calendar });
      if (calErr) throw calErr;

      const { error: gradeErr } = await supabase.from('system_settings').upsert({ school_id: schoolId, key: 'grading_config', value: grading });
      if (gradeErr) throw gradeErr;

      toast.success('Settings saved successfully!');
    } catch (err: any) {
      console.error('Error saving settings:', err);
      toast.error(`Failed to save settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4 bg-gray-50 h-full flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold text-gray-800">Academic Configuration</h2>
        <button
          onClick={saveSettings}
          disabled={saving || loading}
          className="bg-sky-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-sky-600 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {loading ? <p className="text-center text-gray-500">Loading settings...</p> : (
        <>
          <Accordion title="School Calendar" defaultOpen>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Academic Year Start</label>
                <input type="date" value={calendar.start} onChange={e => setCalendar(c => ({ ...c, start: e.target.value }))} className="w-full mt-1 p-2 border border-gray-300 rounded-md bg-gray-50" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Academic Year End</label>
                <input type="date" value={calendar.end} onChange={e => setCalendar(c => ({ ...c, end: e.target.value }))} className="w-full mt-1 p-2 border border-gray-300 rounded-md bg-gray-50" />
              </div>
            </div>
          </Accordion>
          <Accordion title="Grading Scales">
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Default Grading Scale</label>
              <select value={grading.scale} onChange={e => setGrading(g => ({ ...g, scale: e.target.value }))} className="w-full p-2 border border-gray-300 rounded-md bg-gray-50">
                <option value="percentage">Percentage (0-100)</option>
                <option value="letter">Letter Grades (A-F)</option>
                <option value="standards">Standards-Based</option>
              </select>
              <div className="flex items-center justify-between pt-2">
                <label className="text-sm font-medium text-gray-700">Enable Weighted Assignments</label>
                <input type="checkbox" checked={grading.weighted} onChange={e => setGrading(g => ({ ...g, weighted: e.target.checked }))} className="h-5 w-5 rounded text-indigo-600 focus:ring-indigo-500" />
              </div>
            </div>
          </Accordion>
          <Accordion title="Enrollment Settings">
            <p className="text-gray-600 text-sm">Configure admission forms, required documents, and application statuses here.</p>
          </Accordion>
        </>
      )}
    </div>
  );
};
export default AcademicSettingsScreen;
