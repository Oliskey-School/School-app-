import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { BookOpenIcon, SaveIcon, ChevronRightIcon } from '../../constants';
import { api } from '../../lib/api';
import { useAutoSync } from '../../hooks/useAutoSync';
import { useAuth } from '../../context/AuthContext';
import CenteredLoader from '../ui/CenteredLoader';

const Accordion: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <motion.button whileTap={{ scale: 0.99 }} onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4 text-left font-bold text-gray-800">
        <span>{title}</span>
        <motion.span animate={{ rotate: isOpen ? 90 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}>
          <ChevronRightIcon />
        </motion.span>
      </motion.button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="p-4 border-t">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AcademicSettingsScreen: React.FC = () => {
  const auth = useAuth() as any;
  const { currentSchool, user } = auth;
  const schoolId = currentSchool?.id || user?.user_metadata?.school_id;
  const branchId = auth.currentBranchId;

  const [calendar, setCalendar] = useState({ start: '2024-09-05', end: '2025-06-20' });
  const [grading, setGrading] = useState({ scale: 'percentage', weighted: true });
  const [curriculumType, setCurriculumType] = useState<'Nigerian' | 'British' | 'Both'>('Nigerian');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Unified Backend-driven Auto Sync
  useAutoSync(['system_settings'], () => {
    console.log('🔄 [AcademicSettingsScreen] Auto-sync triggered');
    fetchSettings();
  });

  const fetchSettings = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const data = await api.getSystemSettings(schoolId, ['academic_calendar', 'grading_config', 'curriculum_type'], branchId);
      
      const calendarData = data?.find(s => s?.key === 'academic_calendar');
      const gradingData = data?.find(s => s?.key === 'grading_config');
      const curriculumData = data?.find(s => s?.key === 'curriculum_type');

      if (calendarData?.value) setCalendar(calendarData.value);
      if (gradingData?.value) setGrading(gradingData.value);
      if (curriculumData?.value) setCurriculumType(curriculumData.value);
    } catch (err) {
      console.error('Failed to load settings:', err);
      toast.error('Error loading academic settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [schoolId]);

  const saveSettings = async () => {
    if (!schoolId) {
      toast.error("School context missing.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        school_id: schoolId,
        branch_id: (branchId && branchId !== 'all' ? branchId : null)
      };

      await api.updateSystemSettings(schoolId, [
        { key: 'academic_calendar', value: calendar },
        { key: 'grading_config', value: grading },
        { key: 'curriculum_type', value: curriculumType }
      ], branchId);

      // Also update school level curriculum type if available
      try {
          await api.updateSchoolInfo(schoolId, { curriculum_type: curriculumType });
      } catch (e) {
          console.warn("Failed to update school-level curriculum type:", e);
      }

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
        <motion.button
          whileHover={!(saving || loading) ? { scale: 1.02 } : {}}
          whileTap={!(saving || loading) ? { scale: 0.98 } : {}}
          onClick={saveSettings}
          disabled={saving || loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </motion.button>
      </div>

      {loading ? <CenteredLoader message="Loading settings..." className="py-8" /> : (
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

          <Accordion title="Curriculum & Content">
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Primary Curriculum Type</label>
              <select 
                value={curriculumType} 
                onChange={e => setCurriculumType(e.target.value as any)} 
                className="w-full p-2 border border-gray-300 rounded-md bg-gray-50"
              >
                <option value="Nigerian">Nigerian Curriculum</option>
                <option value="British">British Curriculum</option>
                <option value="Both">Both (Dual Curriculum)</option>
              </select>
              <p className="text-xs text-gray-500 italic mt-1">
                This setting determines the default subject lists and term structures used throughout the system.
              </p>
            </div>
          </Accordion>
        </>
      )}
    </div>
  );
};
export default AcademicSettingsScreen;
