
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { SearchIcon, CheckCircleIcon, ClockIcon, PublishIcon, FilterIcon, RefreshIcon, ChevronDownIcon, EyeIcon, XCircleIcon } from '../../constants';
import ReportCardPreview from './ReportCardPreview';
import { StudentReportInfo, ReportCard, Student } from '../../types';
import { supabase } from '../../lib/supabase';

const statusStyles: { [key in ReportCard['status']]: { bg: string, text: string, border: string, icon: React.ReactNode } } = {
  Published: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: <CheckCircleIcon className="w-3.5 h-3.5" /> },
  Submitted: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', icon: <PublishIcon className="w-3.5 h-3.5" /> },
  Draft: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: <ClockIcon className="w-3.5 h-3.5" /> },
};


const ReportCardPublishing: React.FC = () => {
  const [studentsWithReports, setStudentsWithReports] = useState<StudentReportInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<ReportCard['status'] | 'All'>('Submitted');
  const [showPreview, setShowPreview] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentReportInfo | null>(null);

  // Fetch students with their latest report cards from Supabase
  useEffect(() => {
    fetchStudentsWithReports();
  }, []);

  const fetchStudentsWithReports = async () => {
    setIsLoading(true);
    try {
      // Fetch all students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*');

      if (studentsError) throw studentsError;

      // Fetch all report cards
      const { data: reportCardsData, error: reportCardsError } = await supabase
        .from('report_cards')
        .select('*')
        .order('session', { ascending: false })
        .order('term', { ascending: false });

      if (reportCardsError) {
        console.error('Report cards fetch error:', reportCardsError);
        // If table doesn't exist, show students with no reports
        const studentsWithoutReports = (studentsData || []).map(student => ({
          ...student,
          status: 'Draft' as ReportCard['status'],
          reportCards: []
        }));
        setStudentsWithReports(studentsWithoutReports as StudentReportInfo[]);
        setIsLoading(false);
        return;
      }

      // Map students with their latest report card status
      const studentsWithReportStatus = (studentsData || []).map(student => {
        const studentReports = reportCardsData?.filter(rc => rc.student_id === student.id) || [];
        const latestReport = studentReports[0]; // Already sorted

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

  const updateStudentStatus = async (studentId: number, newStatus: ReportCard['status']) => {
    try {
      // Find the latest report card for this student
      const { data: latestReport } = await supabase
        .from('report_cards')
        .select('*')
        .eq('student_id', studentId)
        .order('session', { ascending: false })
        .order('term', { ascending: false })
        .limit(1)
        .single();

      if (latestReport) {
        // Update the report card status
        const updateData: any = { status: newStatus };
        if (newStatus === 'Published') {
          updateData.published_at = new Date().toISOString();
        }

        await supabase
          .from('report_cards')
          .update(updateData)
          .eq('id', latestReport.id);

        // Update local state
        setStudentsWithReports(prev => prev.map(s =>
          s.id === studentId ? { ...s, status: newStatus } : s
        ));
      }
    } catch (err) {
      console.error('Error updating report status:', err);
    }
  };

  const handlePublish = useCallback((studentId: number) => updateStudentStatus(studentId, 'Published'), []);
  const handleRevert = useCallback((studentId: number) => updateStudentStatus(studentId, 'Draft'), []);
  const handleUnpublish = useCallback((studentId: number) => updateStudentStatus(studentId, 'Submitted'), []);

  const handlePublishAll = async () => {
    if (window.confirm('Are you sure you want to publish all submitted report cards?')) {
      const submittedStudents = studentsWithReports.filter(s => s.status === 'Submitted');

      for (const student of submittedStudents) {
        await handlePublish(student.id);
      }

      // Refresh data after bulk publish
      await fetchStudentsWithReports();
    }
  };

  const handlePreview = (student: Student) => {
    setSelectedStudent(student as StudentReportInfo);
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

  // Calculate counts for tabs
  const getCount = (status: ReportCard['status'] | 'All') => {
    if (status === 'All') return studentsWithReports.length;
    return studentsWithReports.filter(s => s.status === status).length;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-100 flex-shrink-0 z-10 sticky top-0">
        <div className="p-4 md:px-8 md:py-5 max-w-7xl mx-auto w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Report Publishing</h1>
              <p className="text-sm text-gray-500 mt-1">Manage and publish student report cards.</p>
            </div>

            {/* Publish All Button - Responsive */}
            <div className="flex items-center gap-3">
              <button
                onClick={fetchStudentsWithReports}
                className="p-2.5 text-gray-500 bg-gray-50 hover:bg-gray-100 hover:text-gray-700 rounded-xl transition-all border border-gray-200"
                title="Refresh"
              >
                <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              {activeTab === 'Submitted' && filteredStudents.length > 0 && (
                <button
                  onClick={handlePublishAll}
                  className="flex-1 md:flex-none px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all flex items-center justify-center gap-2 transform active:scale-95"
                >
                  <PublishIcon className="w-4 h-4" />
                  <span>Publish All</span>
                </button>
              )}
            </div>
          </div>

          {/* Controls Row */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex p-1 bg-gray-100/80 rounded-xl w-full md:w-auto overflow-x-auto no-scrollbar">
              {(['Submitted', 'Published', 'Drafts', 'All'] as const).map(tab => {
                const mappedTab = tab === 'Drafts' ? 'Draft' : tab;
                const isActive = activeTab === mappedTab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(mappedTab)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${isActive
                        ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5'
                        : 'text-gray-500 hover:bg-gray-200/50 hover:text-gray-700'
                      }`}
                  >
                    <span>{tab}</span>
                    <span className={`px-1.5 py-0.5 text-[10px] rounded-md ${isActive ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-200 text-gray-600'
                      }`}>
                      {getCount(mappedTab)}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Search */}
            <div className="relative w-full md:w-72 group">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                <SearchIcon className="w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
              </span>
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-gray-300 transition-all shadow-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-grow p-4 md:px-8 md:py-6 overflow-y-auto w-full max-w-7xl mx-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-500 font-medium">Loading report cards...</p>
          </div>
        ) : filteredStudents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredStudents.map(student => (
              <div key={student.id} className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_25px_-5px_rgba(0,0,0,0.08)] border border-gray-100 transition-all duration-300 group flex flex-col h-full animate-scale-in">

                {/* Card Header: User Info */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={student.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random`}
                        alt={student.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                      />
                      <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${statusStyles[student.status].bg}`}>
                        {statusStyles[student.status].icon}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 line-clamp-1 text-base">{student.name}</h3>
                      <p className="text-xs font-medium text-gray-500">Grade {student.grade}{student.section}</p>
                    </div>
                  </div>
                </div>

                {/* Status Badge - Full Width */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${statusStyles[student.status].bg} ${statusStyles[student.status].border} mb-4`}>
                  <div className={`${statusStyles[student.status].text}`}>
                    {statusStyles[student.status].icon}
                  </div>
                  <span className={`text-xs font-bold ${statusStyles[student.status].text}`}>
                    {student.status.toUpperCase()}
                  </span>
                  {student.status === 'Published' && (
                    <span className="ml-auto text-[10px] uppercase tracking-wide font-bold text-emerald-600">Live</span>
                  )}
                </div>

                {/* Stats / Details Row */}
                <div className="grid grid-cols-2 gap-2 mb-5">
                  <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 text-center">
                    <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Session</div>
                    <div className="text-sm font-bold text-gray-700">2023/24</div>
                  </div>
                  <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 text-center">
                    <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Term</div>
                    <div className="text-sm font-bold text-gray-700">2nd</div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-auto pt-4 border-t border-gray-100 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handlePreview(student)}
                    className="col-span-1 px-3 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <EyeIcon className="w-3.5 h-3.5" />
                    Preview
                  </button>

                  {student.status === 'Submitted' && (
                    <button
                      onClick={() => handlePublish(student.id)}
                      className="col-span-1 px-3 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm shadow-indigo-100 transition-all flex items-center justify-center gap-1.5"
                    >
                      <PublishIcon className="w-3.5 h-3.5" />
                      Publish
                    </button>
                  )}
                  {student.status === 'Published' && (
                    <button
                      onClick={() => handleUnpublish(student.id)}
                      className="col-span-1 px-3 py-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-lg hover:bg-amber-100 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <RefreshIcon className="w-3.5 h-3.5" />
                      Unpublish
                    </button>
                  )}
                  {student.status === 'Draft' && (
                    <button
                      disabled
                      className="col-span-1 px-3 py-2 text-xs font-bold text-gray-400 bg-gray-100 border border-gray-100 rounded-lg cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      <ClockIcon className="w-3.5 h-3.5" />
                      Draft
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center p-8 animate-fade-in">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <FilterIcon className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Reports Found</h3>
            <p className="text-gray-500 max-w-md mx-auto">There are no report cards currently matching the "{activeTab}" filter{searchTerm ? ` and search term "${searchTerm}"` : ''}.</p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-6 px-6 py-2.5 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-all shadow-sm"
              >
                Clear Search
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default ReportCardPublishing;
