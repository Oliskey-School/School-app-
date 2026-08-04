
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SearchIcon, CheckCircleIcon, ClockIcon, PublishIcon, FilterIcon, RefreshIcon, ChevronDownIcon, EyeIcon, XCircleIcon, ChevronRightIcon, ChevronLeftIcon, BuildingLibraryIcon, BookOpenIcon, UserIcon } from '../../constants';
import CenteredLoader from '../ui/CenteredLoader';
import ReportCardPreview from './ReportCardPreview';
import { StudentReportInfo, ReportCard, Student } from '../../types';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useAutoSync } from '../../hooks/useAutoSync';
import { CANONICAL_TERMS } from '../../utils/annualReport';
import { toast } from 'react-hot-toast';

const statusStyles: { [key in ReportCard['status']]: { bg: string, text: string, border: string, icon: React.ReactNode } } = {
  Published: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', icon: <CheckCircleIcon className="w-4 h-4" /> },
  Submitted: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', icon: <PublishIcon className="w-4 h-4" /> },
  Draft: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', icon: <ClockIcon className="w-4 h-4" /> },
};

interface ReportCardPublishingProps {
  schoolId?: string;
  currentBranchId?: string | null;
  currentBranchName?: string;
  isMainBranch?: boolean;
}

// A student re-shaped so its ONE relevant report card (for the currently
// selected class/year/term) sits where the rest of this screen (and the
// preview modal, which always reads reportCards[0]) expects to find it.
interface TermStudent extends StudentReportInfo {
  activeReportId: string | number | null;
  hasReport: boolean;
}

const ReportCardPublishing: React.FC<ReportCardPublishingProps> = ({ schoolId: propSchoolId, currentBranchId, currentBranchName, isMainBranch }) => {
  const { currentSchool, user } = useAuth();
  const activeSchoolId = propSchoolId || currentSchool?.id || user?.user_metadata?.school_id;

  useEffect(() => {
    console.log('[Publishing] Active School ID:', activeSchoolId);
  }, [activeSchoolId]);

  const [studentsWithReports, setStudentsWithReports] = useState<StudentReportInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<ReportCard['status'] | 'All'>('All');
  const [showPreview, setShowPreview] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentReportInfo | null>(null);

  // Drill-down: Class -> Year -> Term -> Student. `selectedClassKey` is
  // `${grade}|${section}`; null means we're on the class-picker landing page.
  const [selectedClassKey, setSelectedClassKey] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');

  // Unified Backend-driven Auto Sync
  useAutoSync(['report_cards'], () => {
    console.log('🔄 [ReportCardPublishing] Auto-sync triggered');
    fetchStudentsWithReports();
  });

  // Fetch students with EVERY report card they have (not just the latest) —
  // a student can have a First, Second AND Third Term report all at once,
  // and each needs to stay reachable, not just whichever sorts first.
  useEffect(() => {
    if (activeSchoolId) {
      fetchStudentsWithReports();
    }
  }, [activeSchoolId]);

  const fetchStudentsWithReports = async () => {
    if (!activeSchoolId) return;
    setIsLoading(true);
    try {
      // Fetch all students for this school using Hybrid API
      // Strict filtering: specific branches only see their own students. Untagged records will appear in 'All Branches'.
      const studentsData = await api.getStudents(activeSchoolId, currentBranchId as string);

      // Fetch all report cards for this school using Hybrid API
      const reportCardsData = await api.getReportCards(activeSchoolId, currentBranchId);

      console.log(`[Diagnostic] Fetched ${studentsData?.length || 0} students and ${reportCardsData?.length || 0} report cards for school ${activeSchoolId}`);

      const studentsWithReportStatus = (studentsData || []).map(student => {
        const studentReports = reportCardsData?.filter(rc => rc.student_id === student.id) || [];
        const latestReport = studentReports[0];

        // Normalize status
        let normalizedStatus: ReportCard['status'] = 'Draft';
        if (latestReport?.status) {
          const s = latestReport.status.charAt(0).toUpperCase() + latestReport.status.slice(1).toLowerCase();
          if (['Draft', 'Submitted', 'Published'].includes(s)) {
            normalizedStatus = s as ReportCard['status'];
          }
        }

        return {
          ...student,
          name: (student as any).name || (student as any).full_name || (student as any).display_name || '',
          avatarUrl: (student as any).avatar_url || student.avatarUrl, // Handle both naming conventions
          status: normalizedStatus,
          hasReport: !!latestReport,
          // Every report card this student has, not just the latest one —
          // the class/year/term drill-down below picks the right one out
          // of this list for whatever the admin is currently viewing.
          reportCards: studentReports.map(rc => ({
            id: rc.id,
            session: rc.session,
            term: rc.term,
            status: (rc.status?.charAt(0).toUpperCase() + rc.status?.slice(1).toLowerCase()) as ReportCard['status'] || 'Draft',
            gradeAverage: rc.grade_average,
            position: rc.position,
            totalStudents: rc.total_students
          }))
        };
      });

      console.log(`[Diagnostic] Mapping complete. ${studentsWithReportStatus.length} students processed.`);
      setStudentsWithReports(studentsWithReportStatus as unknown as StudentReportInfo[]);
    } catch (err) {
      console.error('Error fetching students with reports:', err);
      toast.error('Failed to load report card data');
    } finally {
      setIsLoading(false);
    }
  };

  const updateStudentStatus = async (studentId: string | number, reportCardId: string | number, newStatus: ReportCard['status']) => {
    if (!reportCardId) {
      toast.error("No report card record found for update");
      return;
    }

    try {
      await api.updateReportCardStatus(reportCardId, newStatus);
      toast.success(`Report ${newStatus.toLowerCase()} successfully`);
      fetchStudentsWithReports(); // Refresh data
    } catch (err) {
      console.error('Error updating report status:', err);
      toast.error("Failed to update status");
    }
  };

  const handlePublish = useCallback((studentId: string | number, reportCardId: string | number) =>
    updateStudentStatus(studentId, reportCardId, 'Published'), [activeSchoolId]);

  const handleUnpublish = useCallback((studentId: string | number, reportCardId: string | number) =>
    updateStudentStatus(studentId, reportCardId, 'Submitted'), [activeSchoolId]);

  const handlePreview = (student: StudentReportInfo) => {
    setSelectedStudent(student);
    setShowPreview(true);
  };

  // ---- Level 1: classes, each summarised across ALL of their students' terms ----
  const classSummaries = useMemo(() => {
    const groups = new Map<string, StudentReportInfo[]>();
    studentsWithReports.forEach(student => {
      const key = `${student.grade ?? ''}|${student.section ?? ''}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(student);
    });
    return Array.from(groups.entries())
      .map(([key, students]) => {
        const [gradeStr, section] = key.split('|');
        const allReports = students.flatMap(s => s.reportCards || []);
        return {
          key,
          grade: gradeStr,
          section,
          students,
          totalStudents: students.length,
          submittedCount: allReports.filter(r => r.status === 'Submitted').length,
          publishedCount: allReports.filter(r => r.status === 'Published').length,
        };
      })
      .filter(group => group.students.some(s => (s.name || '').toLowerCase().includes(searchTerm.toLowerCase())) || !searchTerm)
      .sort((a, b) => {
        const gradeDiff = (Number(a.grade) || 0) - (Number(b.grade) || 0);
        return gradeDiff !== 0 ? gradeDiff : a.section.localeCompare(b.section);
      });
  }, [studentsWithReports, searchTerm]);

  const selectedClass = useMemo(
    () => classSummaries.find(c => c.key === selectedClassKey) || null,
    [classSummaries, selectedClassKey]
  );

  // ---- Level 2: years present in this class, most recent first ----
  const availableYears = useMemo(() => {
    if (!selectedClass) return [];
    const set = new Set<string>();
    selectedClass.students.forEach(s => (s.reportCards || []).forEach((r: any) => r.session && set.add(r.session)));
    return Array.from(set).sort().reverse();
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass && availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
    if (selectedClass && !selectedTerm) {
      setSelectedTerm(CANONICAL_TERMS[0]);
    }
  }, [selectedClass, availableYears]);

  const openClass = (key: string) => {
    setSelectedClassKey(key);
    setSelectedYear('');
    setSelectedTerm(CANONICAL_TERMS[0]);
    setActiveTab('All');
    setSearchTerm('');
  };

  const backToClasses = () => {
    setSelectedClassKey(null);
    setSearchTerm('');
  };

  // ---- Level 3/4: this class's roster for the selected year + term ----
  const classTermRoster: TermStudent[] = useMemo(() => {
    if (!selectedClass || !selectedYear || !selectedTerm) return [];
    return selectedClass.students.map(student => {
      const report: any = (student.reportCards || []).find((r: any) => r.session === selectedYear && r.term === selectedTerm);
      return {
        ...student,
        status: report?.status || 'Draft',
        hasReport: !!report,
        activeReportId: report?.id ?? null,
        // Put the matching report first so the Preview modal (which always
        // reads reportCards[0] for its term/session) shows the right one.
        reportCards: report ? [report, ...(student.reportCards || []).filter((r: any) => r !== report)] : (student.reportCards || []),
      };
    });
  }, [selectedClass, selectedYear, selectedTerm]);

  const filteredRoster = useMemo(() =>
    classTermRoster
      .filter(student => activeTab === 'All' || student.status === activeTab)
      .filter(student => (student.name || "").toLowerCase().includes(searchTerm.toLowerCase())),
    [classTermRoster, activeTab, searchTerm]
  );

  const getRosterCount = (status: ReportCard['status'] | 'All') => {
    if (status === 'All') return classTermRoster.length;
    return classTermRoster.filter(s => s.status === status).length;
  };

  const handlePublishAll = async () => {
    const toPublish = filteredRoster.filter(s => s.status === 'Submitted' && s.activeReportId);
    if (toPublish.length === 0) return;

    if (window.confirm(`Are you sure you want to publish all ${toPublish.length} submitted report cards for this class and term?`)) {
      toast.loading(`Publishing ${toPublish.length} reports...`, { id: 'bulk-publish' });

      try {
        const promises = toPublish.map(student =>
          api.updateReportCardStatus(student.activeReportId as string, 'Published')
        );
        await Promise.all(promises);

        toast.success('All reports published', { id: 'bulk-publish' });
        await fetchStudentsWithReports();
      } catch (e) {
        toast.error('Bulk publish failed', { id: 'bulk-publish' });
      }
    }
  };

  if (showPreview && selectedStudent) {
    return <ReportCardPreview student={selectedStudent as any} schoolId={activeSchoolId as string} onClose={() => setShowPreview(false)} />;
  }

  const RegistryHeader = (
    <div className="animate-fade-in">
      <div className="bg-gray-50/80 backdrop-blur-md border border-gray-100 rounded-2xl md:rounded-3xl p-3 md:p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 overflow-hidden relative group">
        <div className="relative z-10 flex items-center space-x-3 md:space-x-4 min-w-0">
          {selectedClass && (
            <button
              onClick={backToClasses}
              className="p-2 md:p-2.5 rounded-xl bg-white border border-gray-200 shadow-sm text-gray-600 hover:text-indigo-600 hover:border-indigo-100 transition-all active:scale-95 flex-shrink-0"
              aria-label="Back to classes"
            >
              <ChevronLeftIcon className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          )}
          <div className={`p-2.5 md:p-3 rounded-xl md:rounded-2xl ${currentBranchName ? 'bg-indigo-100' : 'bg-purple-100'} group-hover:scale-105 transition-transform duration-500 flex-shrink-0`}>
            <BuildingLibraryIcon className={`w-5 h-5 md:w-6 md:h-6 ${currentBranchName ? 'text-indigo-600' : 'text-purple-600'}`} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] md:text-xs font-black uppercase tracking-[0.2em] text-gray-400 leading-none mb-1">
              {selectedClass ? `Grade ${selectedClass.grade}${selectedClass.section}` : 'Active Registry Context'}
            </p>
            <h2 className="text-base md:text-xl font-black text-gray-900 tracking-tight truncate flex flex-wrap items-center gap-2">
              {selectedClass ? 'Class Report Cards' : (currentBranchName ? currentBranchName : 'Global Academic Registry')}
              <span className="px-2 py-0.5 rounded-lg bg-white border border-gray-200 text-[8px] md:text-xs text-gray-500 font-bold uppercase tracking-widest whitespace-nowrap">
                {currentBranchId ? 'Branch Restricted' : 'Universal Access'}
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center space-x-2 md:space-x-3 relative z-10 w-full md:w-auto mt-2 md:mt-0">
          <button
            onClick={fetchStudentsWithReports}
            className="flex-1 md:flex-none p-2 md:px-4 md:py-2 bg-white border border-gray-200 rounded-xl shadow-sm text-gray-600 hover:text-indigo-600 hover:border-indigo-100 transition-all flex items-center justify-center space-x-2 active:scale-95"
          >
            <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-500' : ''}`} />
            <span className="text-xs md:text-sm font-bold">Refresh</span>
          </button>
          {selectedClass && (
            <button
              onClick={handlePublishAll}
              disabled={getRosterCount('Submitted') === 0}
              className="flex-[2] md:flex-none px-4 md:px-6 py-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center space-x-2 active:scale-95 text-xs md:text-sm"
            >
              <PublishIcon className="w-4 h-4" />
              <span>Publish All</span>
            </button>
          )}
        </div>

        {/* Decorative Background Element */}
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-indigo-50/50 rounded-full blur-3xl group-hover:bg-indigo-100/50 transition-colors duration-700" />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Precision Controls Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="px-4 py-3 md:px-6 max-w-7xl mx-auto w-full space-y-4">
          {RegistryHeader}

          {selectedClass && (
            /* Year comes first, then Term — the class page's own drill-down,
               separate from the status tabs/search below. */
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1">
                <label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Academic Year</label>
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {availableYears.length > 0 ? availableYears.map(year => (
                    <button
                      key={year}
                      onClick={() => setSelectedYear(year)}
                      className={`px-3 md:px-4 py-2 text-[10px] md:text-xs font-black rounded-xl whitespace-nowrap transition-colors ${selectedYear === year ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {year}
                    </button>
                  )) : (
                    <span className="text-xs text-gray-400 font-medium py-2">No reports submitted yet for this class.</span>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Term</label>
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {CANONICAL_TERMS.map(term => (
                    <button
                      key={term}
                      onClick={() => setSelectedTerm(term)}
                      className={`px-3 md:px-4 py-2 text-[10px] md:text-xs font-black rounded-xl whitespace-nowrap transition-colors ${selectedTerm === term ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 md:gap-4">
            {selectedClass && (
              /* Tabs - Scrollable on mobile */
              <div className="flex p-1 bg-gray-100 rounded-xl border border-gray-200 overflow-x-auto no-scrollbar touch-pan-x">
                {(['Submitted', 'Published', 'Drafts', 'All'] as const).map(tab => {
                  const mappedTab = tab === 'Drafts' ? 'Draft' : tab;
                  const isActive = activeTab === mappedTab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(mappedTab)}
                      className={`relative flex items-center gap-2 px-3 md:px-4 py-2 text-[9px] md:text-xs font-black rounded-lg transition-colors duration-300 whitespace-nowrap min-w-[80px] md:min-w-0 justify-center ${isActive
                        ? 'text-indigo-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                      {isActive && <motion.div layoutId="reportPublishTab" className="absolute inset-0 bg-white shadow-sm border border-gray-100 rounded-lg" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                      <span className="relative">{tab.toUpperCase()}</span>
                      <span className={`relative px-1.5 py-0.5 text-[8px] md:text-[9px] rounded-md ${isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>
                        {getRosterCount(mappedTab)}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            <div className="flex items-center gap-2 md:gap-3 ml-auto">
              {/* Premium Search */}
              <div className="relative flex-grow sm:flex-none sm:w-64 group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <SearchIcon className="w-3.5 h-3.5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                </span>
                <input
                  type="text"
                  placeholder={selectedClass ? 'Filter students...' : 'Filter by class or student name...'}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs md:text-xs font-bold text-gray-800 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
                />
              </div>

              {selectedClass && activeTab === 'Submitted' && filteredRoster.length > 0 && (
                <button
                  onClick={handlePublishAll}
                  className="hidden md:flex px-4 py-2 text-xs font-black text-white bg-indigo-600 rounded-xl shadow-lg shadow-indigo-900/20 hover:bg-indigo-500 transition-all items-center gap-2 transform active:scale-95"
                >
                  <PublishIcon className="w-3 h-3" />
                  <span>PUBLISH ({filteredRoster.length})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main View */}
      <main className="flex-grow p-4 md:px-8 md:py-8 overflow-y-auto w-full max-w-7xl mx-auto custom-scrollbar">
        {isLoading && studentsWithReports.length === 0 ? (
          <CenteredLoader message="Accessing Neural Records..." className="py-32" />
        ) : !selectedClass ? (
          /* ---- Class picker (landing page) ---- */
          classSummaries.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {classSummaries.map((group, idx) => (
                <motion.button
                  key={group.key}
                  onClick={() => openClass(group.key)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(idx, 20) * 0.03 }}
                  whileHover={{ y: -3 }}
                  className="text-left bg-white rounded-3xl md:rounded-[2rem] p-5 md:p-6 border border-gray-100 hover:border-indigo-200 transition-colors duration-500 group hover:shadow-xl"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 group-hover:scale-105 transition-transform">
                      <BookOpenIcon className="w-6 h-6" />
                    </div>
                    <ChevronRightIcon className="w-5 h-5 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="font-black text-gray-800 text-lg md:text-xl uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                    Grade {group.grade}{group.section}
                  </h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1 mb-4">
                    {group.totalStudents} student{group.totalStudents !== 1 ? 's' : ''}
                  </p>
                  <div className="flex gap-2">
                    <div className="flex-1 p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-center">
                      <div className="text-sm font-black text-indigo-700">{group.submittedCount}</div>
                      <div className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Awaiting</div>
                    </div>
                    <div className="flex-1 p-2 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                      <div className="text-sm font-black text-emerald-700">{group.publishedCount}</div>
                      <div className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Live</div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-40 text-center animate-fade-in">
              <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-wide">No Classes Found</h3>
              <p className="text-gray-500 max-w-sm font-medium leading-relaxed px-4">No students matching the current branch and filters were found.</p>
            </div>
          )
        ) : (
          /* ---- Class detail: roster for the selected year + term ---- */
          !selectedYear ? (
            <div className="flex flex-col items-center justify-center py-40 text-center animate-fade-in">
              <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-wide">No Reports Yet</h3>
              <p className="text-gray-500 max-w-sm font-medium leading-relaxed px-4">
                No report cards have been submitted for this class in any year yet.
              </p>
            </div>
          ) : filteredRoster.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredRoster.map((student, idx) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(idx, 20) * 0.03 }}
                  whileHover={{ y: -3 }}
                  className="bg-white rounded-3xl md:rounded-[2rem] p-4 md:p-6 border border-gray-100 hover:border-indigo-200 transition-colors duration-500 group flex flex-col h-full hover:shadow-xl"
                >
                  {/* User Info Section */}
                  <div className="flex items-start justify-between mb-4 md:mb-6">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="relative flex-shrink-0">
                        {student.avatarUrl ? (
                          <img
                            src={student.avatarUrl}
                            alt={student.name}
                            className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl object-cover border border-gray-200 shadow-sm"
                          />
                        ) : (
                          <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100 text-indigo-500">
                            <UserIcon className="w-6 h-6 md:w-8 h-8 opacity-40" />
                          </div>
                        )}
                        {statusStyles[student.status] && (
                          <div className={`absolute -bottom-1 -right-1 w-5 h-5 md:w-6 md:h-6 rounded-lg border-2 border-white flex items-center justify-center shadow-md ${statusStyles[student.status].bg} ${statusStyles[student.status].border}`}>
                            <div className={statusStyles[student.status].text}>
                              {React.cloneElement(statusStyles[student.status].icon as React.ReactElement, { className: 'w-2.5 h-2.5 md:w-3 md:h-3' })}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-gray-800 line-clamp-1 text-base md:text-lg group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{student.name}</h3>
                        <p className="text-[9px] md:text-xs font-black text-gray-400 uppercase tracking-widest mt-0.5">GRADE {student.grade}{student.section}</p>
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  {statusStyles[student.status] ? (
                    <div className={`flex items-center gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl md:rounded-2xl border transition-all duration-500 mb-4 md:mb-6 ${statusStyles[student.status].bg} ${statusStyles[student.status].border}`}>
                      <div className={`${statusStyles[student.status].text}`}>
                        {statusStyles[student.status].icon}
                      </div>
                      <span className="text-[9px] md:text-xs font-black tracking-[0.1em] text-inherit uppercase">
                        {student.status === 'Draft' ? (student.hasReport ? 'Drafting' : 'No Report Yet') : student.status}
                      </span>
                      {student.status === 'Published' && (
                        <div className="ml-auto flex items-center gap-1.5">
                          <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[8px] md:text-[9px] uppercase font-black text-emerald-600 tracking-widest">Live</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-100 border border-gray-200 mb-4 opacity-50">
                      <span className="text-xs font-bold text-gray-500 uppercase">Unknown Status</span>
                    </div>
                  )}

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-2 md:gap-3 mb-6 md:mb-8">
                    <div className="p-2 md:p-3 rounded-xl md:rounded-2xl bg-gray-50 border border-gray-100 text-center group-hover:bg-gray-100 transition-colors">
                      <div className="text-[8px] md:text-[9px] text-gray-500 uppercase font-black tracking-[0.15em] mb-1">Session</div>
                      <div className="text-xs md:text-xs font-black text-gray-700">{selectedYear}</div>
                    </div>
                    <div className="p-2 md:p-3 rounded-xl md:rounded-2xl bg-gray-50 border border-gray-100 text-center group-hover:bg-gray-100 transition-colors">
                      <div className="text-[8px] md:text-[9px] text-gray-500 uppercase font-black tracking-[0.15em] mb-1">Term</div>
                      <div className="text-xs md:text-xs font-black text-gray-700">{selectedTerm}</div>
                    </div>
                  </div>

                  {/* Precision Actions - Responsive buttons */}
                  <div className="mt-auto pt-4 md:pt-5 border-t border-gray-100 flex flex-col xs:flex-row gap-2 md:gap-3">
                    <button
                      onClick={() => handlePreview(student)}
                      disabled={!student.hasReport}
                      className="flex-1 p-2.5 md:p-3 text-[9px] md:text-xs font-black uppercase tracking-widest text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <EyeIcon className="w-3 md:w-4 h-3 md:h-4" />
                      Preview
                    </button>

                    {student.status === 'Submitted' && (
                      <button
                        onClick={() => handlePublish(student.id, student.activeReportId as string)}
                        className="flex-1 p-2.5 md:p-3 text-[9px] md:text-xs font-black uppercase tracking-widest text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 shadow-lg shadow-indigo-900/40 transition-all flex items-center justify-center gap-2 active:scale-95"
                      >
                        <PublishIcon className="w-3 md:w-4 h-3 md:h-4" />
                        Publish
                      </button>
                    )}
                    {student.status === 'Published' && (
                      <button
                        onClick={() => handleUnpublish(student.id, student.activeReportId as string)}
                        className="flex-1 p-2.5 md:p-3 text-[9px] md:text-xs font-black uppercase tracking-widest text-amber-500 bg-amber-50 border border-amber-100 rounded-xl hover:bg-amber-100 transition-all flex items-center justify-center gap-2 active:scale-95"
                      >
                        <RefreshIcon className="w-3 md:w-4 h-3 md:h-4" />
                        Unpublish
                      </button>
                    )}
                    {student.status === 'Draft' && (
                      <div className="flex-1 p-2.5 md:p-3 text-[9px] md:text-xs font-black uppercase tracking-widest text-gray-400 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center gap-2 opacity-60">
                        <ClockIcon className="w-3 md:w-4 h-3 md:h-4" />
                        {student.hasReport ? 'Draft' : 'None'}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-40 text-center animate-fade-in group">
              <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-wide">
                {activeTab === 'All' ? `No Students Match "${selectedTerm}"` : `No ${activeTab} Reports`}
              </h3>
              <p className="text-gray-500 max-w-sm font-medium leading-relaxed px-4">
                {activeTab === 'Submitted'
                  ? 'No reports for this class, year and term are currently awaiting your verification.'
                  : activeTab === 'Published'
                    ? 'Zero live reports found for this class, year and term. Reports must be "Submitted" before they can be authorized for release.'
                    : activeTab === 'Draft'
                      ? 'All reports for this class, year and term have already been processed to "Submitted" or "Published" status.'
                      : `No students match the current filters for ${selectedYear} — ${selectedTerm}.`}
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 mt-8">
                {activeTab !== 'All' && (
                  <button
                    onClick={() => setActiveTab('All')}
                    className="px-8 py-3 bg-white border border-gray-200 text-indigo-600 font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-indigo-50 transition-all shadow-sm flex items-center gap-2 group"
                  >
                    <span>Show All Students</span>
                    <ChevronRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="px-8 py-3 bg-white border border-gray-200 text-gray-500 font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-gray-50 transition-all shadow-sm"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            </div>
          )
        )}
      </main>
    </div>
  );
};

export default ReportCardPublishing;
