import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAutoSync } from '../../hooks/useAutoSync';
import { Student, Teacher, Notice } from '../../types';
import { api } from '../../lib/api';
import { SUBJECT_COLORS, BookOpenIcon, ClipboardListIcon, MegaphoneIcon, UsersIcon, ClockIcon, GlobeIcon, ChevronRightIcon } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';
import { toast } from 'react-hot-toast';

interface ClassroomScreenProps {
  subjectName: string;
  navigateTo: (view: string, title: string, props?: any) => void;
}

const ClassroomScreen: React.FC<ClassroomScreenProps> = ({ subjectName, navigateTo }) => {
  const { profile } = useProfile();

  const [student, setStudent] = useState<Student | null>(null);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [classmates, setClassmates] = useState<Student[]>([]);
  const [announcements, setAnnouncements] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'curriculum' | 'classmates'>('overview');
  
  // Curriculum state
  const [selectedTerm, setSelectedTerm] = useState<number>(1);
  const [topics, setTopics] = useState<any[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [subjectInfo, setSubjectInfo] = useState<any>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Get student profile
      const currentStudent = profile as unknown as Student;
      setStudent(currentStudent);

      if (currentStudent && currentStudent.grade) {
        // 5. Fetch Subject Details to get Curriculum Type and Subject ID
        const schoolSubjects = await api.getMySubjects();
        const info = schoolSubjects.find(s => s.name === subjectName);
        setSubjectInfo(info);

        if (info && info.id) {
          // 2. Fetch Classmates across ALL sections taking this specific subject
          const peers = await api.getStudentsBySubject(info.id);
          setClassmates(peers.filter(p => p.id !== currentStudent.id));
        } else if (currentStudent.grade) {
          // Fallback to class-based if subject ID not found
          const peers = await api.getStudentsByClass(currentStudent.grade, currentStudent.section, currentStudent.schoolId);
          setClassmates(peers.filter(p => p.id !== currentStudent.id));
        }
      }

    } catch (err) {
      console.error("Error loading classroom data:", err);
    } finally {
      setLoading(false);
    }
  }, [profile, subjectName]);

  const loadTopics = useCallback(async (term: number) => {
    if (!subjectInfo?.id) return;
    setIsLoadingTopics(true);
    try {
      const data = await api.getStudentCurriculumTopics(subjectInfo.id, term.toString());
      setTopics(data);
    } catch (error) {
      console.error('Failed to load curriculum topics:', error);
    } finally {
      setIsLoadingTopics(false);
    }
  }, [subjectInfo]);

  useEffect(() => {
    if (activeTab === 'curriculum') {
      loadTopics(selectedTerm);
    }
  }, [activeTab, selectedTerm, loadTopics]);

  // Real-time synchronization
  useAutoSync(['notices', 'students', 'curriculum'], loadData);

  useEffect(() => {
    if (profile) {
      loadData();
    }
  }, [profile, loadData]);

  const colorClass = SUBJECT_COLORS[subjectName] || 'bg-gray-200 text-gray-800';
  const [bgColor, textColor] = colorClass.split(' ');
  const ringColor = bgColor.replace('bg-', 'ring-').replace('-100', '-300').replace('-200', '-300').replace('-300', '-400').replace('-400', '-500').replace('-500', '-600');

  const quickActions = [
    { label: 'Assignments', icon: <ClipboardListIcon className="h-6 w-6" />, action: () => navigateTo('assignments', `${subjectName} Assignments`, { studentId: student?.id, subjectFilter: subjectName }) },
    { label: 'Resources', icon: <BookOpenIcon className="h-6 w-6" />, action: () => navigateTo('library', 'E-Learning Library') },
  ];

  if (loading) return <div className="p-8 text-center text-gray-500">Loading classroom...</div>;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <main className="flex-grow p-4 overflow-y-auto space-y-4">
        {/* Subject Header */}
        <div className={`p-6 rounded-3xl text-white shadow-xl ${bgColor.replace('-200', '-600').replace('-100', '-600')} relative overflow-hidden`}>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                {subjectInfo?.curriculum_type || 'Nigerian'} Curriculum
              </span>
              <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                {student?.class_name || 'Classroom'}
              </span>
            </div>
            <h3 className="text-3xl font-black">{subjectName}</h3>
            <div className="flex items-center mt-4 gap-3">
              <img src={teacher?.avatarUrl || `https://ui-avatars.com/api/?name=${teacher?.name || 'T'}`} className="w-10 h-10 rounded-2xl border-2 border-white/50" alt="" />
              <div>
                <p className="text-xs font-bold opacity-80 uppercase tracking-tighter">Instructor</p>
                <p className="text-sm font-black">{teacher?.name || 'Assigned Teacher'}</p>
              </div>
            </div>
          </div>
          <GlobeIcon className="absolute -right-10 -bottom-10 w-48 h-48 opacity-10 rotate-12" />
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 p-1 bg-gray-200/50 rounded-2xl">
          {[
            { id: 'overview', label: 'Overview', icon: <GlobeIcon className="w-4 h-4" /> },
            { id: 'curriculum', label: 'Curriculum', icon: <BookOpenIcon className="w-4 h-4" /> },
            { id: 'classmates', label: 'Classmates', icon: <UsersIcon className="w-4 h-4" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs transition-all ${
                activeTab === tab.id 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:bg-white/50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-fade-in">
            <div className="lg:col-span-2 space-y-5">
              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-4">
                {quickActions.map(item => (
                  <button key={item.label} onClick={item.action} className={`bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-3 hover:ring-2 ${ringColor} transition-all`}>
                    <div className={textColor}>{item.icon}</div>
                    <span className={`font-black ${textColor} text-center text-sm uppercase tracking-tight`}>{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Latest Announcements */}
              <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <MegaphoneIcon className={`h-5 w-5 ${textColor}`} />
                    <h3 className="font-black text-lg text-gray-800 uppercase tracking-tighter">Subject Board</h3>
                  </div>
                  <span className="text-[10px] font-black text-gray-400 bg-gray-50 px-2 py-1 rounded-md uppercase">Latest Updates</span>
                </div>
                
                {announcements.length > 0 ? (
                  <div className="space-y-4">
                    {announcements.map(notice => (
                      <div key={notice.id} className="p-4 rounded-2xl bg-gray-50 border-l-4 border-orange-500 hover:bg-orange-50/50 transition-colors">
                        <h4 className="font-bold text-gray-900 leading-tight">{notice.title}</h4>
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{notice.content}</p>
                        <div className="mt-3 flex items-center text-[10px] font-black text-gray-400 uppercase tracking-widest gap-2">
                          <ClockIcon className="w-3 h-3" />
                          {new Date(notice.timestamp || notice.created_at || '').toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <MegaphoneIcon className="w-8 h-8 text-gray-200" />
                    </div>
                    <p className="text-gray-400 font-bold">No new announcements for this subject.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-1">
              {/* Top Classmates Preview */}
              <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm h-full">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <UsersIcon className={`h-5 w-5 ${textColor}`} />
                    <h3 className="font-black text-lg text-gray-800 uppercase tracking-tighter">Study Peers</h3>
                  </div>
                  <button onClick={() => setActiveTab('classmates')} className="text-orange-500 hover:underline">
                    <ChevronRightIcon className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  {classmates.slice(0, 8).length > 0 ? classmates.slice(0, 8).map(c => (
                    <div key={c.id} className="flex items-center justify-between group">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <img src={c.avatarUrl || `https://ui-avatars.com/api/?name=${c.name}`} alt={c.name} className="w-10 h-10 rounded-2xl object-cover ring-2 ring-transparent group-hover:ring-orange-200 transition-all" />
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        </div>
                        <p className="text-sm font-bold text-gray-700 group-hover:text-gray-900">{c.name}</p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-gray-400 text-center py-4 italic">You're the pioneer in this class!</p>
                  )}
                  {classmates.length > 8 && (
                    <button 
                      onClick={() => setActiveTab('classmates')}
                      className="w-full py-3 text-xs font-black text-gray-400 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors uppercase tracking-widest"
                    >
                      + {classmates.length - 8} More
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'curriculum' && (
          <div className="space-y-6 animate-fade-in pb-10">
            <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm">
               <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-orange-50 rounded-2xl text-orange-600">
                  <BookOpenIcon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900">Academic Roadmap</h2>
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Always up to date</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map(t => (
                  <button
                    key={t}
                    onClick={() => setSelectedTerm(t)}
                    className={`py-4 rounded-2xl border-2 transition-all font-black uppercase text-[10px] tracking-widest ${selectedTerm === t
                      ? 'border-orange-500 bg-orange-50 text-orange-600 shadow-md shadow-orange-100'
                      : 'border-gray-50 bg-gray-50 text-gray-400 hover:bg-white hover:border-orange-200 hover:text-gray-600'
                      }`}
                  >
                    Term {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 px-4">
                <ClockIcon className="w-4 h-4 text-orange-500" />
                <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest">Term {selectedTerm} Learning Units</h3>
              </div>

              {isLoadingTopics ? (
                <div className="space-y-3 px-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-white rounded-3xl animate-pulse border border-gray-100" />
                  ))}
                </div>
              ) : topics.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100 mx-2">
                  <BookOpenIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 font-bold">Curriculum content being prepared...</p>
                </div>
              ) : (
                <div className="space-y-4 px-2">
                  {topics.map((topic, idx) => (
                    <div key={topic.id} className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500 group-hover:w-2 transition-all"></div>
                      <div className="flex items-start gap-5">
                        <div className="w-12 h-12 bg-orange-50 rounded-2xl flex-shrink-0 flex items-center justify-center text-orange-600 font-black text-lg border border-orange-100">
                          {topic.week_number || idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Week {topic.week_number || idx + 1}</span>
                            {idx === 0 && <span className="bg-green-100 text-green-700 text-[8px] px-1.5 py-0.5 rounded font-black uppercase">Current</span>}
                          </div>
                          <h4 className="font-black text-gray-900 text-lg mb-2 leading-tight">{topic.title}</h4>
                          <p className="text-sm text-gray-500 leading-relaxed font-medium">{topic.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'classmates' && (
          <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm animate-fade-in">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                  <UsersIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-xl text-gray-900">Your Classmates</h3>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{classmates.length} Peers taking {subjectName}</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              {classmates.length > 0 ? classmates.map(c => (
                <div key={c.id} className="flex flex-col items-center p-4 rounded-3xl hover:bg-gray-50 transition-colors group">
                  <div className="relative mb-3">
                    <img src={c.avatarUrl || `https://ui-avatars.com/api/?name=${c.name}`} alt={c.name} className="w-20 h-20 rounded-[2rem] object-cover ring-4 ring-transparent group-hover:ring-indigo-100 transition-all shadow-md" />
                    <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 border-4 border-white rounded-full"></div>
                  </div>
                  <p className="text-sm font-black text-gray-800 text-center leading-tight">{c.name}</p>
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter mt-1">{c.section || 'A'} Stream</span>
                </div>
              )) : (
                <div className="col-span-full py-10 text-center">
                  <p className="text-gray-400 font-bold italic">Gathering your peers...</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ClassroomScreen;
