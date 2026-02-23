
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { SearchIcon, CheckCircleIcon, ClockIcon, PublishIcon, FilterIcon, RefreshIcon, ChevronDownIcon, EyeIcon, XCircleIcon, ChevronRightIcon, BuildingLibraryIcon, BookOpenIcon } from '../../constants';
import ReportCardPreview from './ReportCardPreview';
import { StudentReportInfo, ReportCard, Student } from '../../types';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeSubscription } from '../../hooks/useRealtimeSubscription';
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

const ReportCardPublishing: React.FC<ReportCardPublishingProps> = ({ schoolId: propSchoolId, currentBranchId, currentBranchName, isMainBranch }) => {
  const { currentSchool, user } = useAuth();
  const activeSchoolId = propSchoolId || currentSchool?.id || user?.user_metadata?.school_id;

  useEffect(() => {
    console.log('[Publishing] Active School ID:', activeSchoolId);
  }, [activeSchoolId]);

  const [studentsWithReports, setStudentsWithReports] = useState<StudentReportInfo[]>([]);
  const [reportCards, setReportCards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<ReportCard['status'] | 'All'>('Submitted');
  const [showPreview, setShowPreview] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentReportInfo | null>(null);

  // Real-time Subscription for Report Cards
  useRealtimeSubscription({
    table: 'report_cards',
    filter: activeSchoolId ? `school_id=eq.${activeSchoolId}` : undefined,
    callback: () => {
      console.log('[Realtime] Refreshing Reports...');
      fetchStudentsWithReports();
    }
  });

  // Fetch students with their latest report cards
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

      // Map students with their latest report card status
      const studentsWithReportStatus = (studentsData || []).map(student => {
        const studentReports = reportCardsData?.filter(rc => rc.student_id === student.id) || [];
        const latestReport = studentReports[0];

        return {
          ...student,
          status: latestReport ? (latestReport.status as ReportCard['status']) : 'Draft',
          hasReport: !!latestReport,
          reportCards: studentReports.map(rc => ({
            id: rc.id,
            session: rc.session,
            term: rc.term,
            status: rc.status as ReportCard['status'],
            gradeAverage: rc.grade_average,
            position: rc.position,
            totalStudents: rc.total_students
          }))
        };
      });

      setStudentsWithReports(studentsWithReportStatus as StudentReportInfo[]);
    } catch (err) {
      console.error('Error fetching students with reports:', err);
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

  const handlePublishAll = async () => {
    const toPublish = filteredStudents.filter(s => s.status === 'Submitted' && s.reportCards?.[0]?.id);
    if (toPublish.length === 0) return;

    if (window.confirm(`Are you sure you want to publish all ${toPublish.length} submitted report cards?`)) {
      toast.loading(`Publishing ${toPublish.length} reports...`, { id: 'bulk-publish' });

      try {
        const promises = toPublish.map(student =>
          api.updateReportCardStatus(student.reportCards[0].id, 'Published')
        );
        await Promise.all(promises);

        toast.success('All reports published', { id: 'bulk-publish' });
        await fetchStudentsWithReports();
      } catch (e) {
        toast.error('Bulk publish failed', { id: 'bulk-publish' });
      }
    }
  };

  const handlePreview = (student: StudentReportInfo) => {
    setSelectedStudent(student);
    setShowPreview(true);
  };

  const filteredStudents = useMemo(() =>
    studentsWithReports
      .filter(student => activeTab === 'All' || student.status === activeTab)
      .filter(student => student.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [studentsWithReports, activeTab, searchTerm]
  );

  const getCount = (status: ReportCard['status'] | 'All') => {
    if (status === 'All') return studentsWithReports.length;
    return studentsWithReports.filter(s => s.status === status).length;
  };

  if (showPreview && selectedStudent) {
    return <ReportCardPreview student={selectedStudent as any} schoolId={activeSchoolId as string} onClose={() => setShowPreview(false)} />;
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Precision Controls Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="px-4 py-3 md:px-6 max-w-7xl mx-auto w-full space-y-4">
          {/* Branch Context Indicator - Responsive version */}
          <div className="animate-fade-in">
            <div className="bg-gray-50/80 backdrop-blur-md border border-gray-100 rounded-2xl md:rounded-3xl p-3 md:p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 overflow-hidden relative group">
              <div className="relative z-10 flex items-center space-x-3 md:space-x-4">
                <div className={`p-2.5 md:p-3 rounded-xl md:rounded-2xl ${currentBranchName ? 'bg-indigo-100' : 'bg-purple-100'} group-hover:scale-105 transition-transform duration-500`}>
                  <BuildingLibraryIcon className={`w-5 h-5 md:w-6 md:h-6 ${currentBranchName ? 'text-indigo-600' : 'text-purple-600'}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 leading-none mb-1">Active Registry Context</p>
                  <h2 className="text-base md:text-xl font-black text-gray-900 tracking-tight truncate flex flex-wrap items-center gap-2">
                    {currentBranchName ? currentBranchName : 'Global Academic Registry'}
                    <span className="px-2 py-0.5 rounded-lg bg-white border border-gray-200 text-[8px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest whitespace-nowrap">
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
                <button
                  onClick={handlePublishAll}
                  disabled={getCount('Submitted') === 0}
                  className="flex-[2] md:flex-none px-4 md:px-6 py-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center space-x-2 active:scale-95 text-xs md:text-sm"
                >
                  <PublishIcon className="w-4 h-4" />
                  <span>Publish All</span>
                </button>
              </div>

              {/* Decorative Background Element */}
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-indigo-50/50 rounded-full blur-3xl group-hover:bg-indigo-100/50 transition-colors duration-700" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 md:gap-4">
            {/* Tabs - Scrollable on mobile */}
            <div className="flex p-1 bg-gray-100 rounded-xl border border-gray-200 overflow-x-auto no-scrollbar touch-pan-x">
              {(['Submitted', 'Published', 'Drafts', 'All'] as const).map(tab => {
                const mappedTab = tab === 'Drafts' ? 'Draft' : tab;
                const isActive = activeTab === mappedTab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(mappedTab)}
                    className={`flex items-center gap-2 px-3 md:px-4 py-2 text-[9px] md:text-[10px] font-black rounded-lg transition-all duration-300 whitespace-nowrap min-w-[80px] md:min-w-0 justify-center ${isActive
                      ? 'bg-white text-indigo-600 shadow-sm border border-gray-100'
                      : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    <span>{tab.toUpperCase()}</span>
                    <span className={`px-1.5 py-0.5 text-[8px] md:text-[9px] rounded-md ${isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>
                      {getCount(mappedTab)}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              {/* Premium Search */}
              <div className="relative flex-grow sm:flex-none sm:w-64 group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <SearchIcon className="w-3.5 h-3.5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                </span>
                <input
                  type="text"
                  placeholder="Filter by name..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-[10px] md:text-xs font-bold text-gray-800 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
                />
              </div>

              {activeTab === 'Submitted' && filteredStudents.length > 0 && (
                <button
                  onClick={handlePublishAll}
                  className="hidden md:flex px-4 py-2 text-[10px] font-black text-white bg-indigo-600 rounded-xl shadow-lg shadow-indigo-900/20 hover:bg-indigo-500 transition-all items-center gap-2 transform active:scale-95"
                >
                  <PublishIcon className="w-3 h-3" />
                  <span>PUBLISH ({filteredStudents.length})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <main className="flex-grow p-4 md:px-8 md:py-8 overflow-y-auto w-full max-w-7xl mx-auto custom-scrollbar">
        {isLoading && studentsWithReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 animate-fade-in text-center">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="mt-6 text-gray-500 font-black uppercase tracking-widest text-xs">Accessing Neural Records...</p>
          </div>
        ) : filteredStudents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredStudents.map((student, idx) => (
              <div
                key={student.id}
                className="bg-white rounded-3xl md:rounded-[2rem] p-4 md:p-6 border border-gray-100 hover:border-indigo-200 transition-all duration-500 group flex flex-col h-full animate-scale-in hover:shadow-xl"
                style={{ animationDelay: `${idx * 30}ms` }}
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
                          <span className="font-black text-lg md:text-xl">{student.name.charAt(0)}</span>
                        </div>
                      )}
                      <div className={`absolute -bottom-1 -right-1 w-5 h-5 md:w-6 md:h-6 rounded-lg border-2 border-white flex items-center justify-center shadow-md ${statusStyles[student.status].bg} ${statusStyles[student.status].border}`}>
                        <div className={statusStyles[student.status].text}>
                          {React.cloneElement(statusStyles[student.status].icon as React.ReactElement, { className: 'w-2.5 h-2.5 md:w-3 md:h-3' })}
                        </div>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-gray-800 line-clamp-1 text-base md:text-lg group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{student.name}</h3>
                      <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">GRADE {student.grade}{student.section}</p>
                    </div>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className={`flex items-center gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl md:rounded-2xl border transition-all duration-500 mb-4 md:mb-6 ${statusStyles[student.status].bg} ${statusStyles[student.status].border}`}>
                  <div className={`${statusStyles[student.status].text}`}>
                    {statusStyles[student.status].icon}
                  </div>
                  <span className="text-[9px] md:text-[10px] font-black tracking-[0.1em] text-inherit uppercase">
                    {student.status === 'Draft' ? 'Drafting' : student.status}
                  </span>
                  {student.status === 'Published' && (
                    <div className="ml-auto flex items-center gap-1.5">
                      <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[8px] md:text-[9px] uppercase font-black text-emerald-600 tracking-widest">Live</span>
                    </div>
                  )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-2 md:gap-3 mb-6 md:mb-8">
                  <div className="p-2 md:p-3 rounded-xl md:rounded-2xl bg-gray-50 border border-gray-100 text-center group-hover:bg-gray-100 transition-colors">
                    <div className="text-[8px] md:text-[9px] text-gray-500 uppercase font-black tracking-[0.15em] mb-1">Session</div>
                    <div className="text-[10px] md:text-xs font-black text-gray-700">{student.reportCards[0]?.session || '23/24'}</div>
                  </div>
                  <div className="p-2 md:p-3 rounded-xl md:rounded-2xl bg-gray-50 border border-gray-100 text-center group-hover:bg-gray-100 transition-colors">
                    <div className="text-[8px] md:text-[9px] text-gray-500 uppercase font-black tracking-[0.15em] mb-1">Term</div>
                    <div className="text-[10px] md:text-xs font-black text-gray-700">{student.reportCards[0]?.term || '2nd'}</div>
                  </div>
                </div>

                {/* Precision Actions - Responsive buttons */}
                <div className="mt-auto pt-4 md:pt-5 border-t border-gray-100 flex flex-col xs:flex-row gap-2 md:gap-3">
                  <button
                    onClick={() => handlePreview(student)}
                    className="flex-1 p-2.5 md:p-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <EyeIcon className="w-3 md:w-4 h-3 md:h-4" />
                    Preview
                  </button>

                  {student.status === 'Submitted' && (
                    <button
                      onClick={() => handlePublish(student.id, student.reportCards[0]?.id)}
                      className="flex-1 p-2.5 md:p-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 shadow-lg shadow-indigo-900/40 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                      <PublishIcon className="w-3 md:w-4 h-3 md:h-4" />
                      Publish
                    </button>
                  )}
                  {student.status === 'Published' && (
                    <button
                      onClick={() => handleUnpublish(student.id, student.reportCards[0]?.id)}
                      className="flex-1 p-2.5 md:p-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-50 border border-amber-100 rounded-xl hover:bg-amber-100 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                      <RefreshIcon className="w-3 md:w-4 h-3 md:h-4" />
                      Unpublish
                    </button>
                  )}
                  {student.status === 'Draft' && (
                    <div className="flex-1 p-2.5 md:p-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center gap-2 opacity-60">
                      <ClockIcon className="w-3 md:w-4 h-3 md:h-4" />
                      Draft
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-40 text-center animate-fade-in group">
            <div className="w-24 h-24 bg-white border border-gray-200 rounded-[2rem] flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 transition-transform duration-500">
              <FilterIcon className="w-10 h-10 text-gray-400 group-hover:text-indigo-500 transition-colors" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-wide">
              {activeTab === 'All' ? 'Neural Registry Empty' : `No ${activeTab} Reports`}
            </h3>
            <p className="text-gray-500 max-w-sm font-medium leading-relaxed px-4">
              {activeTab === 'Submitted'
                ? 'No reports are currently awaiting your verification in this branch. Once teachers submit them, they will appear here.'
                : activeTab === 'Published'
                  ? 'Zero live reports found in this frequency. Reports must be "Submitted" before they can be authorized for release.'
                  : activeTab === 'Draft'
                    ? 'All active records have already been processed to "Submitted" or "Published" status.'
                    : `No records matching the current branch and filters were found.`}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 mt-8">
              {activeTab !== 'All' && (
                <button
                  onClick={() => setActiveTab('All')}
                  className="px-8 py-3 bg-white border border-gray-200 text-indigo-600 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-indigo-50 transition-all shadow-sm flex items-center gap-2 group"
                >
                  <span>Global Registry</span>
                  <ChevronRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-8 py-3 bg-white border border-gray-200 text-gray-500 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-gray-50 transition-all shadow-sm"
                >
                  Clear Search
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ReportCardPublishing;
