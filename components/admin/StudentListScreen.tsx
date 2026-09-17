

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { ChevronDown, Plus, ChevronRight, CircleAlert } from 'lucide-react';
import {
  SearchIcon,
  gradeColors,
  FilterIcon,
  ViewGridIcon,
  getFormattedClassName
} from '../../constants';
import CenteredLoader from '../ui/CenteredLoader';
import LoadingState from '../ui/LoadingState';
import LowDataImage from '../ui/LowDataImage';
import { Student } from '../../types';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';
import { useAutoSync } from '../../hooks/useAutoSync';
import { motion, AnimatePresence } from 'framer-motion';

type StudentStatus = 'Active' | 'Withdrawn' | 'Pending';
const ALL_STATUSES: StudentStatus[] = ['Active', 'Withdrawn', 'Pending'];

const STATUS_STYLES: Record<StudentStatus, string> = {
  Active: 'bg-green-100 text-green-700',
  Withdrawn: 'bg-red-100 text-red-600',
  Pending: 'bg-yellow-100 text-yellow-700',
};

const StudentRow: React.FC<{
  student: any;
  onSelect: (student: Student) => void;
  onStatusChange: (student: any, newStatus: StudentStatus) => void;
}> = ({ student, onSelect, onStatusChange }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; right: number; openUpward: boolean } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const currentStatus: StudentStatus = (student.status as StudentStatus) || 'Active';
  const otherStatuses = ALL_STATUSES.filter(s => s !== currentStatus);

  // The row lives inside accordions that use overflow-hidden for their
  // collapse/expand height animation, which clips any absolutely-positioned
  // dropdown that tries to render outside their bounds (visible on the last
  // row of a section). Portaling the menu to document.body and positioning
  // it with fixed viewport coordinates — flipping upward when there isn't
  // room below — sidesteps that clipping entirely.
  const toggleMenu = () => {
    if (!menuOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const estimatedMenuHeight = 40 + otherStatuses.length * 34;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < estimatedMenuHeight + 16;
      setMenuPos({
        top: openUpward ? undefined : rect.bottom + 8,
        bottom: openUpward ? window.innerHeight - rect.top + 8 : undefined,
        right: window.innerWidth - rect.right,
        openUpward,
      });
    }
    setMenuOpen(v => !v);
  };

  // Keep the menu from drifting away from its trigger while open — simplest
  // correct behavior is to close it on scroll, same as most native dropdowns.
  React.useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [menuOpen]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -1 }}
      className="w-full text-left bg-white rounded-lg p-2 flex items-center justify-between transition-shadow duration-200 hover:bg-gray-50 hover:shadow-md ring-1 ring-gray-100 relative"
      layout
    >
      <button
        onClick={() => onSelect(student)}
        className="flex items-center space-x-3 flex-grow min-w-0"
        aria-label={`View profile for ${student.name}`}
      >
        <motion.div
          whileTap={{ scale: 0.95 }}
          className="w-10 h-10 rounded-full object-cover flex-shrink-0 overflow-hidden bg-gray-100"
        >
          <LowDataImage
            src={student.avatarUrl || student.avatar_url || `https://ui-avatars.com/api/?name=${student.name}`}
            alt={student.name}
            className="w-full h-full"
            loading="lazy"
          />
        </motion.div>
        <div className="flex-grow min-w-0 text-left">
          <p className="font-bold text-sm text-gray-800 truncate">{student.name || student.full_name}</p>
          <p className="text-xs text-gray-500">
            ID: {student.schoolGeneratedId || student.school_generated_id || 'Pending'}
            {student.curriculum_type && (
              <span className="ml-2 text-gray-600 bg-gray-100 px-1 py-0.5 rounded text-xs">
                {student.curriculum_type}
              </span>
            )}
            {(student.user?.initial_password || student.initial_password) && (
              <span className="ml-2 text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded text-xs">
                Pass: {student.user?.initial_password || student.initial_password}
              </span>
            )}
          </p>
        </div>
      </button>

      <div className="flex items-center gap-1.5 px-2 flex-shrink-0">
        <motion.span
          key={currentStatus}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[currentStatus] ?? 'bg-gray-100 text-gray-600'}`}
        >
          {currentStatus}
        </motion.span>
        <div className="relative">
          <motion.button
            ref={triggerRef}
            onClick={(e) => { e.stopPropagation(); toggleMenu(); }}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.1 }}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-200 text-gray-400 transition-colors"
            aria-label="Change student status"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${menuOpen ? 'rotate-180' : ''}`} />
          </motion.button>
          {menuOpen && menuPos && createPortal(
            <AnimatePresence>
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <motion.div
                key="menu"
                initial={{ opacity: 0, y: menuPos.openUpward ? 10 : -10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: menuPos.openUpward ? 10 : -10, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                style={{ position: 'fixed', top: menuPos.top, bottom: menuPos.bottom, right: menuPos.right }}
                className="z-50 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 min-w-[150px]"
              >
                <p className="text-[9px] text-gray-400 px-3 pb-1.5 font-semibold uppercase tracking-widest">Change status</p>
                {otherStatuses.map(s => (
                  <motion.button
                    key={s}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onStatusChange(student, s);
                    }}
                    whileTap={{ scale: 0.98 }}
                    whileHover={{ x: 2 }}
                    className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-gray-50 transition-colors ${
                      s === 'Active' ? 'text-green-700' : s === 'Withdrawn' ? 'text-red-600' : 'text-yellow-700'
                    }`}
                  >
                    Mark as {s}
                  </motion.button>
                ))}
              </motion.div>
            </AnimatePresence>,
            document.body
          )}
        </div>
      </div>
    </motion.div>
  );
};

const StageAccordion: React.FC<{ title: string; count: number; children: React.ReactNode, defaultOpen?: boolean, forceOpen?: boolean }> = ({ title, count, children, defaultOpen = false, forceOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  // While a search is active the section must not be able to hide a match:
  // closed sections render no children at all, so a matching student inside one
  // is invisible and the search looks broken.
  const open = forceOpen || isOpen;

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      <motion.button
        onClick={() => setIsOpen(!open)}
        whileTap={{ scale: 0.99 }}
        className="w-full flex justify-between items-center p-4 text-left"
        aria-expanded={open}
      >
        <h3 className="font-bold text-lg text-gray-800">{title}</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-full">{count} Students</span>
          <ChevronRight className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
        </div>
      </motion.button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 space-y-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SubStageAccordion: React.FC<{ title: string; count: number; children: React.ReactNode, defaultOpen?: boolean, forceOpen?: boolean }> = ({ title, count, children, defaultOpen = false, forceOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  // While a search is active the section must not be able to hide a match:
  // closed sections render no children at all, so a matching student inside one
  // is invisible and the search looks broken.
  const open = forceOpen || isOpen;
  return (
    <div className="bg-gray-50 rounded-xl overflow-hidden">
      <motion.button
        onClick={() => setIsOpen(!open)}
        whileTap={{ scale: 0.99 }}
        className="w-full flex justify-between items-center p-3 text-left hover:bg-gray-100 transition-colors"
        aria-expanded={open}
      >
        <h4 className="font-semibold text-gray-700">{title}</h4>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium text-gray-600 bg-gray-200 px-2 py-0.5 rounded-full">{count}</span>
          <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
        </div>
      </motion.button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="overflow-hidden"
          >
            <div className="p-2 space-y-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ClassAccordion: React.FC<{ title: string; count: number; children: React.ReactNode, defaultOpen?: boolean, forceOpen?: boolean }> = ({ title, count, children, defaultOpen = false, forceOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  // While a search is active the section must not be able to hide a match:
  // closed sections render no children at all, so a matching student inside one
  // is invisible and the search looks broken.
  const open = forceOpen || isOpen;

  return (
    <div className="bg-white rounded-xl overflow-hidden border">
      <motion.button
        onClick={() => setIsOpen(!open)}
        whileTap={{ scale: 0.99 }}
        className="w-full flex justify-between items-center p-3 text-left hover:bg-gray-100 transition-colors"
        aria-expanded={open}
      >
        <h4 className="font-semibold text-sm text-gray-600">{title}</h4>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{count}</span>
          <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
        </div>
      </motion.button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="overflow-hidden"
          >
            <div className="p-2 space-y-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface StudentListScreenProps {
  filter?: { grade: number; section?: string; };
  navigateTo: (view: string, title: string, props?: any) => void;
  currentBranchId?: string | null;
  schoolId?: string;
}

// Maps a roster row from the API into the shape StudentRow / the profile screen expect.
const mapStudent = (s: any) => ({
  id: s.id,
  schoolId: s.school_id || s.schoolId,
  schoolGeneratedId: s.school_generated_id || s.schoolGeneratedId,
  name: s.name || s.full_name || '',
  email: s.email || '',
  avatarUrl: s.avatar_url || s.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.name || s.full_name || 'student'}`,
  grade: s.grade,
  section: s.section,
  department: s.department,
  attendanceStatus: s.attendance_status || s.attendanceStatus || 'Absent',
  birthday: s.birthday,
  classId: s.class_id || s.classId,
  status: s.status,
  initial_password: s.user?.initial_password || s.initial_password
});

// Graduated/Transferred students live exclusively in the Past Students archive —
// they must never appear (or count) in the active roster.
const isCurrentStudent = (s: any) => s.status !== 'Graduated' && s.status !== 'Transferred';

/** One class group's headcount, derived from /students/summary. */
interface ClassGroup {
  name: string;
  grade: number | null;
  // Every (section) this display name covers — normally exactly one.
  sections: Array<string | null>;
  total: number;
}

const classNameFor = (grade: number | null | undefined, section: string | null | undefined) =>
  grade === null || grade === undefined ? 'Unassigned' : getFormattedClassName(grade, section);

// The roster used to be fetched whole (every student in the school, ~1KB each:
// 1.5MB at 1,500 students — half a minute on a 400kbps link) and grouped on the
// client. Sections start collapsed, so a class's rows are only needed when the
// admin opens it: this fetches just that group, on mount, i.e. on expand
// (the accordions render no children while closed).
const ClassStudents: React.FC<{
  schoolId: string;
  branchId?: string;
  group: ClassGroup;
  statusFilter: 'All' | StudentStatus;
  onSelect: (student: Student) => void;
  onStatusChange: (student: any, newStatus: StudentStatus) => void;
}> = ({ schoolId, branchId, group, statusFilter, onSelect, onStatusChange }) => {
  const single = group.sections.length === 1;
  const { data: rows = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['students', schoolId, branchId, 'class', group.grade, single ? group.sections[0] : '*', statusFilter],
    queryFn: async () => {
      // A display name normally maps to one (grade, section). If it covers
      // several (e.g. a null and an empty section), fetch the grade once and
      // keep only this group's sections.
      const raw = await api.getStudentsInClassGroup(schoolId, branchId, group.grade, single ? group.sections[0] : undefined, statusFilter);
      const wanted = new Set(group.sections.map(s => s ?? null));
      return (raw || []).filter(isCurrentStudent).filter((s: any) => single || wanted.has(s.section ?? null)).map(mapStudent);
    },
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) return <LoadingState type="list" rows={Math.min(group.total, 4)} className="p-1" />;
  if (isError) {
    return (
      <div className="flex items-center justify-between px-2 py-1.5 text-sm text-gray-500">
        <span>Couldn't load this class.</span>
        <button onClick={() => refetch()} className="font-semibold text-indigo-600 hover:text-indigo-700">Retry</button>
      </div>
    );
  }
  return <>{rows.map((s: Student) => <StudentRow key={s.id} student={s} onSelect={onSelect} onStatusChange={onStatusChange} />)}</>;
};

const StudentListScreen: React.FC<StudentListScreenProps> = ({ filter, navigateTo, currentBranchId, schoolId: propSchoolId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'stage' | 'class'>('stage');
  const [statusFilter, setStatusFilter] = useState<'All' | StudentStatus>('All');
  const [pendingStatusChange, setPendingStatusChange] = useState<{ student: any; status: StudentStatus } | null>(null);
  const [withdrawalReason, setWithdrawalReason] = useState('');
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [showBottomBar, setShowBottomBar] = useState(true);

  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const schoolId = propSchoolId || profile?.schoolId || profile?.school_id || user?.user_metadata?.school_id;
  const branchArg = currentBranchId || undefined;
  // Prefix for every roster query on this screen (summary, per-class, search),
  // so one invalidation refreshes whichever of them are on screen.
  const queryKey = ['students', schoolId, currentBranchId];

  // Headcounts per class group: a few hundred bytes, replaces the whole-roster fetch.
  const { data: summary = [], isLoading, isError, error: fetchError, refetch } = useQuery({
    queryKey: [...queryKey, 'summary'],
    queryFn: async () => (schoolId ? api.getStudentSummary(schoolId, branchArg) : []),
    enabled: !!schoolId,
    staleTime: 1000 * 60 * 5,
  });

  // A closed section renders none of its rows, so while the roster is filtered
  // by a search term a closed section can swallow the only match and the search
  // reads as broken. Sections stay force-opened for as long as a term is active;
  // clearing it restores whatever the user had expanded.
  const isSearching = searchTerm.trim().length > 0;

  // Search is server-side now (the client no longer holds the roster), so it
  // waits for typing to pause rather than firing a request per keystroke.
  const [debouncedTerm, setDebouncedTerm] = useState('');
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedTerm(searchTerm.trim()), 300);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

  const { data: searchResults = [], isLoading: searchLoading, isError: searchError } = useQuery({
    queryKey: [...queryKey, 'search', debouncedTerm, statusFilter],
    queryFn: async () => (await api.searchStudents(schoolId, branchArg, debouncedTerm, statusFilter)).filter(isCurrentStudent).map(mapStudent),
    enabled: !!schoolId && debouncedTerm.length > 0,
    staleTime: 1000 * 60,
  });

  useAutoSync(['students'], () => {
    queryClient.invalidateQueries({ queryKey });
  });

  const handleStudentSelect = (student: Student) => {
    navigateTo('studentProfileAdminView', student.name, { student });
  };

  const handleStatusChange = (student: any, newStatus: StudentStatus) => {
    if (newStatus === 'Withdrawn') {
      setPendingStatusChange({ student, status: newStatus });
      setWithdrawalReason('');
    } else {
      applyStatusChange(student, newStatus, '');
    }
  };

  const applyStatusChange = async (student: any, status: StudentStatus, reason: string) => {
    setIsChangingStatus(true);
    try {
      await api.updateStudent(student.id, {
        status,
        ...(status === 'Withdrawn' && reason.trim() ? { withdrawal_reason: reason.trim() } : {}),
      });
      queryClient.invalidateQueries({ queryKey });
      toast.success(`${student.name} marked as ${status}`);
      setPendingStatusChange(null);
      setWithdrawalReason('');
    } catch {
      toast.error('Failed to update status. Please try again.');
    } finally {
      setIsChangingStatus(false);
    }
  };

  // Class groups (with headcounts) that survive the status filter and the
  // grade/section `filter` prop — the same population the old client-side
  // filtering produced, minus the rows.
  const groups = useMemo<ClassGroup[]>(() => {
    const byName = new Map<string, ClassGroup>();
    for (const r of summary) {
      if (statusFilter !== 'All' && (r.status || 'Active') !== statusFilter) continue;
      if (filter && (r.grade !== filter.grade || (filter.section && r.section !== filter.section))) continue;
      const name = classNameFor(r.grade, r.section);
      const g = byName.get(name) || { name, grade: r.grade, sections: [], total: 0 };
      const sec = r.section ?? null;
      if (!g.sections.includes(sec)) g.sections.push(sec);
      g.total += r.count;
      byName.set(name, g);
    }
    return [...byName.values()];
  }, [summary, statusFilter, filter]);

  // Search results are already rows, so they group exactly as the roster used to.
  const filteredStudentsList = useMemo(() => {
    if (!isSearching) return [] as Student[];
    return searchResults.filter(student => {
      if (filter) {
        const gradeMatch = student.grade === filter.grade;
        const sectionMatch = !filter.section || student.section === filter.section;
        return gradeMatch && sectionMatch;
      }
      return true;
    });
  }, [isSearching, searchResults, filter]);

  const sortClassNames = (names: string[]) => [...names].sort((a, b) => {
    const gradeA = parseInt(a.match(/\d+/)?.[0] || '0');
    const gradeB = parseInt(b.match(/\d+/)?.[0] || '0');
    if (gradeA !== gradeB) return gradeB - gradeA;
    const sectionA = a.match(/[A-Z]/)?.[0] || '';
    const sectionB = b.match(/[A-Z]/)?.[0] || '';
    return sectionA.localeCompare(sectionB);
  });

  type Stage = 'preschool' | 'lower' | 'upper' | 'junior' | 'senior';
  const stageOf = (grade: number | null): Stage => {
    if (grade === null || grade === undefined) return 'preschool';
    if (grade <= 0) return 'preschool';
    if (grade <= 3) return 'lower';
    if (grade <= 6) return 'upper';
    if (grade <= 9) return 'junior';
    return 'senior';
  };

  // Stage -> ordered class groups. From the summary normally; from the search
  // results (as synthetic groups whose rows are already loaded) while searching.
  const groupsByStage = useMemo(() => {
    const stages: Record<Stage, ClassGroup[]> = { preschool: [], lower: [], upper: [], junior: [], senior: [] };
    const source: ClassGroup[] = isSearching
      ? (() => {
          const byName = new Map<string, ClassGroup>();
          filteredStudentsList.forEach(student => {
            const grade = student.grade === null || student.grade === undefined ? null : student.grade;
            const name = classNameFor(grade, student.section);
            const g = byName.get(name) || { name, grade, sections: [student.section ?? null], total: 0 };
            g.total += 1;
            byName.set(name, g);
          });
          return [...byName.values()];
        })()
      : groups;
    source.forEach(g => stages[stageOf(g.grade)].push(g));
    (Object.keys(stages) as Stage[]).forEach(k => {
      const order = sortClassNames(stages[k].map(g => g.name));
      stages[k] = order.map(n => stages[k].find(g => g.name === n)!);
    });
    return stages;
  }, [isSearching, filteredStudentsList, groups]);

  const searchRowsByClass = useMemo(() => {
    const byName: Record<string, Student[]> = {};
    filteredStudentsList.forEach(student => {
      const name = classNameFor(student.grade === null || student.grade === undefined ? null : student.grade, student.section);
      (byName[name] ||= []).push(student);
    });
    return byName;
  }, [filteredStudentsList]);

  const classesForClassView = useMemo(() => {
    const all = (Object.values(groupsByStage) as ClassGroup[][]).flat();
    return all.sort((a, b) => a.name.localeCompare(b.name));
  }, [groupsByStage]);

  const countOf = (gs: ClassGroup[]) => gs.reduce((n, g) => n + g.total, 0);
  const seniorCount = countOf(groupsByStage.senior);
  const juniorCount = countOf(groupsByStage.junior);
  const lowerPrimaryCount = countOf(groupsByStage.lower);
  const upperPrimaryCount = countOf(groupsByStage.upper);
  const preschoolCount = countOf(groupsByStage.preschool);
  const primaryCount = lowerPrimaryCount + upperPrimaryCount;
  const totalCount = seniorCount + juniorCount + primaryCount + preschoolCount;

  // A class section's body: already-loaded rows while searching, otherwise
  // fetched on expand.
  const renderClassBody = (g: ClassGroup) => (
    isSearching
      ? (searchRowsByClass[g.name] || []).map(s => <StudentRow key={s.id} student={s} onSelect={handleStudentSelect} onStatusChange={handleStatusChange} />)
      : <ClassStudents schoolId={schoolId} branchId={branchArg} group={g} statusFilter={statusFilter} onSelect={handleStudentSelect} onStatusChange={handleStatusChange} />
  );

  const renderContent = () => {
    if (isLoading || (isSearching && searchLoading)) {
      return <LoadingState type="list" rows={8} className="p-2" />;
    }

    if (isError || (isSearching && searchError)) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-sm border border-red-100 text-center m-2">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <CircleAlert className="w-6 h-6 text-red-500" />
          </div>
          <h3 className="font-bold text-gray-900 mb-1">Failed to Load Students</h3>
          <p className="text-sm text-gray-500 mb-4">{String(fetchError || 'Search failed')}</p>
          <button
            onClick={() => (isSearching ? queryClient.invalidateQueries({ queryKey }) : refetch())}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Retry Now
          </button>
        </div>
      );
    }

    if (totalCount === 0) {
      return (
        <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-dashed border-gray-200 m-2">
          <p className="text-gray-500 font-medium">No students found matching your search.</p>
        </div>
      );
    }

    if (filter) {
      // A single class's roster (opened from a class card): flat list, no headers.
      return (
        <div className="space-y-3">
          {classesForClassView.map(g => (
            <React.Fragment key={g.name}>{renderClassBody(g)}</React.Fragment>
          ))}
        </div>
      );
    }

    if (viewMode === 'class') {
      return (
        <div className="space-y-3">
          {classesForClassView.map(g => (
            <ClassAccordion key={g.name} title={g.name} count={g.total} forceOpen={isSearching}>
              {renderClassBody(g)}
            </ClassAccordion>
          ))}
        </div>
      );
    }

    return (
      <>
        {seniorCount > 0 && (
          <StageAccordion title="Senior Secondary" count={seniorCount} forceOpen={isSearching}>
            {groupsByStage.senior.map(g => (
              <SubStageAccordion key={g.name} title={g.name} count={g.total} forceOpen={isSearching}>
                {renderClassBody(g)}
              </SubStageAccordion>
            ))}
          </StageAccordion>
        )}

        {juniorCount > 0 && (
          <StageAccordion title="Junior Secondary" count={juniorCount} forceOpen={isSearching}>
            {groupsByStage.junior.map(g => (
              <SubStageAccordion key={g.name} title={g.name} count={g.total} forceOpen={isSearching}>
                {renderClassBody(g)}
              </SubStageAccordion>
            ))}
          </StageAccordion>
        )}

        {primaryCount > 0 && (
          <StageAccordion title="Primary School" count={primaryCount} forceOpen={isSearching}>
            {upperPrimaryCount > 0 && (
              <SubStageAccordion title="Upper Primary (4-6)" count={upperPrimaryCount} forceOpen={isSearching}>
                {groupsByStage.upper.map(g => (
                  <ClassAccordion key={g.name} title={g.name} count={g.total} forceOpen={isSearching}>
                    {renderClassBody(g)}
                  </ClassAccordion>
                ))}
              </SubStageAccordion>
            )}
            {lowerPrimaryCount > 0 && (
              <SubStageAccordion title="Lower Primary (1-3)" count={lowerPrimaryCount} forceOpen={isSearching}>
                {groupsByStage.lower.map(g => (
                  <ClassAccordion key={g.name} title={g.name} count={g.total} forceOpen={isSearching}>
                    {renderClassBody(g)}
                  </ClassAccordion>
                ))}
              </SubStageAccordion>
            )}
          </StageAccordion>
        )}

        {preschoolCount > 0 && (
          <StageAccordion title="Preschool / Nursery" count={preschoolCount} forceOpen={isSearching}>
            {groupsByStage.preschool.map(g => (
              <ClassAccordion key={g.name} title={g.name} count={g.total} forceOpen={isSearching}>
                {renderClassBody(g)}
              </ClassAccordion>
            ))}
          </StageAccordion>
        )}
      </>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 relative">
      <div className="p-4 bg-gray-100 z-10 space-y-3">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <SearchIcon className="text-gray-600" />
          </span>
          <input type="text" placeholder="Search by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" aria-label="Search for a student" />
        </div>

        {!filter && (
          <>
            <div className="flex space-x-2">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setViewMode('stage')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${viewMode === 'stage' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:bg-gray-200'}`}
              >
                By Stage
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setViewMode('class')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${viewMode === 'class' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:bg-gray-200'}`}
              >
                By Class
              </motion.button>
            </div>
            <div className="flex space-x-2 overflow-x-auto pb-0.5">
              {(['All', 'Active', 'Withdrawn', 'Pending'] as const).map(s => (
                <motion.button
                  key={s}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setStatusFilter(s)}
                  className={`flex-shrink-0 px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    statusFilter === s
                      ? s === 'All' ? 'bg-indigo-600 text-white'
                        : s === 'Active' ? 'bg-green-600 text-white'
                        : s === 'Withdrawn' ? 'bg-red-500 text-white'
                        : 'bg-yellow-500 text-white'
                      : 'bg-white text-gray-600 ring-1 ring-gray-200'
                  }`}
                >
                  {s}
                </motion.button>
              ))}
            </div>
          </>
        )}
      </div>

      <main className="flex-grow px-4 pb-32 space-y-4 overflow-y-auto">
        {renderContent()}
      </main>

      <div className="fixed bottom-24 right-6 lg:bottom-12 lg:right-12 z-40">
        <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={() => navigateTo('addStudent', 'Add New Student', {})} className="bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" aria-label="Add new student"><Plus className="h-6 w-6" /></motion.button>
      </div>

      {/* Withdrawal reason modal */}
      <AnimatePresence>
        {pendingStatusChange?.status === 'Withdrawn' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm"
            >
              <h3 className="font-bold text-gray-900 text-lg mb-1">Withdraw Student</h3>
              <p className="text-sm text-gray-500 mb-4">
                Please provide a reason for withdrawing <strong className="text-gray-700">{pendingStatusChange.student.name}</strong>.
              </p>
              <textarea
                value={withdrawalReason}
                onChange={e => setWithdrawalReason(e.target.value)}
                placeholder="Reason for withdrawal (e.g. relocated, transferred, financial)..."
                className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                autoFocus
              />
              <div className="flex gap-3 mt-4">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setPendingStatusChange(null); setWithdrawalReason(''); }}
                  disabled={isChangingStatus}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => applyStatusChange(pendingStatusChange.student, 'Withdrawn', withdrawalReason)}
                  disabled={!withdrawalReason.trim() || isChangingStatus}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isChangingStatus ? 'Saving…' : 'Confirm Withdrawal'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentListScreen;
