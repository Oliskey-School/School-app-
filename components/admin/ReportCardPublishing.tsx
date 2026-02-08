
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { SearchIcon, CheckCircleIcon, ClockIcon, PublishIcon, FilterIcon, RefreshIcon, ChevronDownIcon, EyeIcon, XCircleIcon } from '../../constants';
import ReportCardPreview from './ReportCardPreview';
import { StudentReportInfo, ReportCard, Student } from '../../types';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeSubscription } from '../../hooks/useRealtimeSubscription';
import { toast } from 'react-hot-toast';

const statusStyles: { [key in ReportCard['status']]: { bg: string, text: string, border: string, icon: React.ReactNode } } = {
  Published: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', icon: <CheckCircleIcon className="w-4 h-4" /> },
  Submitted: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', icon: <PublishIcon className="w-4 h-4" /> },
  Draft: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', icon: <ClockIcon className="w-4 h-4" /> },
};

interface ReportCardPublishingProps {
  schoolId?: string;
  currentBranchId?: string | null;
}

const ReportCardPublishing: React.FC<ReportCardPublishingProps> = ({ schoolId: propSchoolId, currentBranchId }) => {
  const { currentSchool, user } = useAuth();
  const activeSchoolId = propSchoolId || currentSchool?.id || user?.user_metadata?.school_id;

  const [studentsWithReports, setStudentsWithReports] = useState<StudentReportInfo[]>([]);
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

  // Fetch students with their latest report cards from Supabase
  useEffect(() => {
    if (activeSchoolId) {
      fetchStudentsWithReports();
    }
  }, [activeSchoolId]);

  const fetchStudentsWithReports = async () => {
    if (!activeSchoolId) return;
    setIsLoading(true);
    try {
      // Fetch all students for this school
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', activeSchoolId);

      if (studentsError) throw studentsError;

      // Fetch all report cards for this school
      const { data: reportCardsData, error: reportCardsError } = await supabase
        .from('report_cards')
        .select('*')
        .eq('school_id', activeSchoolId)
        .order('session', { ascending: false })
        .order('term', { ascending: false });

      if (reportCardsError) {
        console.error('Report cards fetch error:', reportCardsError);
        const studentsWithoutReports = (studentsData || []).map(student => ({
          ...student,
          status: 'Draft' as ReportCard['status'],
          reportCards: []
        }));
        setStudentsWithReports(studentsWithoutReports as StudentReportInfo[]);
        return;
      }

      // Map students with their latest report card status
      const studentsWithReportStatus = (studentsData || []).map(student => {
        const studentReports = reportCardsData?.filter(rc => rc.student_id === student.id) || [];
        const latestReport = studentReports[0];

        return {
          ...student,
          status: (latestReport?.status as ReportCard['status']) || 'Draft',
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

  const updateStudentStatus = async (studentId: string | number, newStatus: ReportCard['status']) => {
    try {
      // Find the latest report card for this student
      const { data: latestReport } = await supabase
        .from('report_cards')
        .select('*')
        .eq('student_id', studentId)
        .eq('school_id', activeSchoolId)
        .order('session', { ascending: false })
        .order('term', { ascending: false })
        .limit(1)
        .single();

      if (latestReport) {
        const updateData: any = { status: newStatus };
        if (newStatus === 'Published') {
          updateData.published_at = new Date().toISOString();
        }

        const { error } = await supabase
          .from('report_cards')
          .update(updateData)
          .eq('id', latestReport.id);

        if (error) throw error;

        toast.success(`Report ${newStatus.toLowerCase()} successfully`);
        // Local update handled by Realtime Subscription
      } else {
        toast.error("No report card found to update");
      }
    } catch (err) {
      console.error('Error updating report status:', err);
      toast.error("Failed to update status");
    }
  };

  const handlePublish = useCallback((studentId: string | number) => updateStudentStatus(studentId, 'Published'), [activeSchoolId]);
  const handleUnpublish = useCallback((studentId: string | number) => updateStudentStatus(studentId, 'Submitted'), [activeSchoolId]);

  const handlePublishAll = async () => {
    const toPublish = filteredStudents.filter(s => s.status === 'Submitted');
    if (toPublish.length === 0) return;

    if (window.confirm(`Are you sure you want to publish all ${toPublish.length} submitted report cards?`)) {
      toast.loading(`Publishing ${toPublish.length} reports...`, { id: 'bulk-publish' });

      try {
        for (const student of toPublish) {
          await handlePublish(student.id);
        }
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

  if (showPreview && selectedStudent) {
    return <ReportCardPreview student={selectedStudent} onClose={() => setShowPreview(false)} />;
  }

  const getCount = (status: ReportCard['status'] | 'All') => {
    if (status === 'All') return studentsWithReports.length;
    return studentsWithReports.filter(s => s.status === status).length;
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans">
      {/* Controls Header - Redesigned for Dark Theme */}
      <div className="bg-slate-900/40 backdrop-blur-xl border-b border-white/5 sticky top-0 z-20">
        <div className="p-4 md:px-8 md:py-6 max-w-7xl mx-auto w-full space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                  <PublishIcon className="w-5 h-5 text-indigo-400" />
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Report Publishing</h1>
              </div>
              <p className="text-sm text-slate-500 mt-1 font-medium">Verified for {currentSchool?.name || 'Demo School'}</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchStudentsWithReports}
                className="p-3 text-slate-400 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 group"
                title="Refresh Database"
              >
                <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              </button>
              {activeTab === 'Submitted' && filteredStudents.length > 0 && (
                <button
                  onClick={handlePublishAll}
                  className="flex-1 md:flex-none px-6 py-3 text-sm font-black text-white bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-900/20 hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 transform active:scale-95 border border-indigo-400/20"
                >
                  <PublishIcon className="w-4 h-4" />
                  <span>Publish {filteredStudents.length} Reports</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Glassmorphic Tabs */}
            <div className="flex p-1.5 bg-white/5 rounded-[1.25rem] border border-white/5 w-full lg:w-auto overflow-x-auto no-scrollbar scroll-smooth">
              {(['Submitted', 'Published', 'Drafts', 'All'] as const).map(tab => {
                const mappedTab = tab === 'Drafts' ? 'Draft' : tab;
                const isActive = activeTab === mappedTab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(mappedTab)}
                    className={`flex items-center gap-2.5 px-5 py-2.5 text-xs font-black rounded-xl transition-all duration-300 whitespace-nowrap ${isActive
                      ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/30 border border-indigo-400/30'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                      }`}
                  >
                    <span>{tab.toUpperCase()}</span>
                    <span className={`px-2 py-0.5 text-[10px] rounded-lg ${isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-500'
                      }`}>
                      {getCount(mappedTab)}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Premium Search */}
            <div className="relative w-full lg:w-80 group">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <SearchIcon className="w-5 h-5 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
              </span>
              <input
                type="text"
                placeholder="Find student..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 text-sm font-bold text-slate-200 bg-white/5 border border-white/5 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 hover:bg-white/10 transition-all outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <main className="flex-grow p-4 md:px-8 md:py-8 overflow-y-auto w-full max-w-7xl mx-auto custom-scrollbar">
        {isLoading && studentsWithReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 animate-fade-in text-center">
            <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            <p className="mt-6 text-slate-500 font-black uppercase tracking-widest text-xs">Accessing Neural Records...</p>
          </div>
        ) : filteredStudents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredStudents.map((student, idx) => (
              <div
                key={student.id}
                className="bg-white/5 backdrop-blur-md rounded-[2rem] p-6 border border-white/5 hover:border-indigo-500/40 transition-all duration-500 group flex flex-col h-full animate-scale-in hover:bg-white/[0.08] hover:shadow-2xl hover:shadow-indigo-900/20"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                {/* User Info Section */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {student.avatarUrl ? (
                        <img
                          src={student.avatarUrl}
                          alt={student.name}
                          className="w-14 h-14 rounded-2xl object-cover border border-white/10 shadow-lg"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-inner text-indigo-400">
                          <span className="font-black text-xl">{student.name.charAt(0)}</span>
                        </div>
                      )}
                      <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-lg border-2 border-slate-900 flex items-center justify-center shadow-lg ${statusStyles[student.status].bg} ${statusStyles[student.status].border}`}>
                        <div className={statusStyles[student.status].text}>
                          {React.cloneElement(statusStyles[student.status].icon as React.ReactElement, { className: 'w-3 h-3' })}
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-black text-white line-clamp-1 text-lg group-hover:text-indigo-300 transition-colors uppercase tracking-tight">{student.name}</h3>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">GRADE {student.grade}{student.section}</p>
                    </div>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-500 mb-6 ${statusStyles[student.status].bg} ${statusStyles[student.status].border}`}>
                  <div className={`${statusStyles[student.status].text}`}>
                    {statusStyles[student.status].icon}
                  </div>
                  <span className={`text-[10px] font-black tracking-[0.1em] ${statusStyles[student.status].text}`}>
                    {student.status.toUpperCase()}
                  </span>
                  {student.status === 'Published' && (
                    <div className="ml-auto flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[9px] uppercase font-black text-emerald-500/80 tracking-widest">Live</span>
                    </div>
                  )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                  <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/5 text-center group-hover:bg-slate-900 transition-colors">
                    <div className="text-[9px] text-slate-600 uppercase font-black tracking-[0.15em] mb-1">Session</div>
                    <div className="text-xs font-black text-slate-300">{student.reportCards[0]?.session || '2023/24'}</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/5 text-center group-hover:bg-slate-900 transition-colors">
                    <div className="text-[9px] text-slate-600 uppercase font-black tracking-[0.15em] mb-1">Term</div>
                    <div className="text-xs font-black text-slate-300">{student.reportCards[0]?.term || '2nd'}</div>
                  </div>
                </div>

                {/* Precision Actions */}
                <div className="mt-auto pt-5 border-t border-white/5 flex gap-3">
                  <button
                    onClick={() => handlePreview(student)}
                    className="flex-1 p-3 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <EyeIcon className="w-3.5 h-3.5" />
                    Preview
                  </button>

                  {student.status === 'Submitted' && (
                    <button
                      onClick={() => handlePublish(student.id)}
                      className="flex-1 p-3 text-[10px] font-black uppercase tracking-widest text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 shadow-lg shadow-indigo-900/40 transition-all flex items-center justify-center gap-2 border border-indigo-400/30"
                    >
                      <PublishIcon className="w-3.5 h-3.5" />
                      Publish
                    </button>
                  )}
                  {student.status === 'Published' && (
                    <button
                      onClick={() => handleUnpublish(student.id)}
                      className="flex-1 p-3 text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl hover:bg-amber-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshIcon className="w-3.5 h-3.5" />
                      Unpublish
                    </button>
                  )}
                  {student.status === 'Draft' && (
                    <div className="flex-1 p-3 text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-900 rounded-xl border border-white/5 flex items-center justify-center gap-2 cursor-not-allowed opacity-50">
                      <ClockIcon className="w-3.5 h-3.5" />
                      Draft
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-40 text-center animate-fade-in">
            <div className="w-24 h-24 bg-slate-900 border border-indigo-500/10 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner shadow-indigo-900/20">
              <FilterIcon className="w-10 h-10 text-slate-700" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-wide">No Records In Frequency</h3>
            <p className="text-slate-500 max-w-sm font-medium leading-relaxed">No report cards matching "{activeTab}" filter currently exist in the system registry.</p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-8 px-8 py-3 bg-white/5 border border-white/10 text-indigo-400 font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-white/10 transition-all shadow-xl"
              >
                Reset Frequency
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default ReportCardPublishing;
