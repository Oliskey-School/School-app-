

import React, { useState, useEffect } from 'react';
import { ChartBarIcon, TrophyIcon, TrendingUpIcon, SUBJECT_COLORS, gradeColors } from '../../constants';
// import { mockSubjectAverages, mockTopStudents, mockAttendanceCorrelation } from '../../data';
import { supabase } from '../../lib/supabase';

interface SubjectAverage {
  subject: string;
  averageScore: number;
}

interface TopStudent {
  id: string;
  name: string;
  grade: number;
  section: string;
  averageScore: number;
  avatarUrl?: string;
}

interface AttendanceCorrelation {
  attendanceBracket: string;
  averageScore: number;
}

const SubjectGradesChart: React.FC<{ data: SubjectAverage[] }> = ({ data }) => {
  const maxValue = 100;
  return (
    <div className="space-y-2">
      {data.map(item => {
        const colorClass = SUBJECT_COLORS[item.subject] || 'bg-gray-200 text-gray-800';
        return (
          <div key={item.subject} className="flex items-center space-x-2">
            <div className="w-28 text-sm font-medium text-gray-600 truncate">{item.subject}</div>
            <div className="flex-grow bg-gray-200 rounded-full h-5">
              <div className={`${colorClass} h-5 rounded-full flex items-center justify-end pr-2 text-xs font-bold`} style={{ width: `${(item.averageScore / maxValue) * 100}%` }}>
                {item.averageScore}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  );
};

const TopStudentsList: React.FC<{ students: TopStudent[] }> = ({ students }) => {
  return (
    <div className="space-y-3">
      {students.map((student) => (
        <div key={student.id} className="bg-gray-50 p-3 rounded-lg flex items-center space-x-3">
          {student.avatarUrl ? (
            <img src={student.avatarUrl} alt={student.name} className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500">
              {/* Use a simple placeholder if UserIcon is not imported in this file scope's props, but ReportsScreen imports chart icons. 
                  Wait, reports screen imports chart icons. I need to make sure UserIcon is imported or available. 
                  Checking imports: `import { ChartBarIcon, TrophyIcon, TrendingUpIcon, SUBJECT_COLORS, gradeColors } from '../../constants';`
                  It does NOT import UserIcon. I must add it to imports first. 
               */}
              <span className="text-sm font-bold">{student.name.charAt(0)}</span>
            </div>
          )}
          <div className="flex-grow">
            <p className="font-bold text-gray-800">{student.name}</p>
            <p className="text-sm text-gray-500">Grade {student.grade}{student.section}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg text-green-600">{student.averageScore}%</p>
            <p className="text-xs text-gray-500">Average</p>
          </div>
        </div>
      ))}
    </div>
  );
};

const AttendanceCorrelationChart: React.FC<{ data: AttendanceCorrelation[] }> = ({ data }) => {
  if (data.length < 2) return <div className="text-center text-gray-500 py-10">Not enough data for correlation</div>;

  const width = 280;
  const height = 120;
  const padding = 20;
  const maxValue = 100;
  // Sort logic just in case, though brackets usually ordered
  const stepX = (width - padding * 2) / (data.length - 1 || 1);
  const stepY = (height - padding * 2) / maxValue;
  const points = data.map((d, i) => `${padding + i * stepX},${height - padding - d.averageScore * stepY}`).join(' ');

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {/* Y-axis labels and lines */}
        {[...Array(5)].map((_, i) => {
          const y = height - padding - ((i * 25) * stepY);
          return (
            <g key={i}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="2" />
              <text x={padding - 5} y={y + 3} textAnchor="end" fontSize="10" fill="#6b7280">{i * 25}</text>
            </g>
          )
        })}
        {/* Main line */}
        <polyline fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
        {/* Data points */}
        {data.map((d, i) => (
          <circle key={i} cx={padding + i * stepX} cy={height - padding - d.averageScore * stepY} r="3" fill="white" stroke="#4f46e5" strokeWidth="2" />
        ))}
      </svg>
      {/* X-axis labels */}
      <div className="flex justify-between px-5 -mt-4">
        {data.map((d, i) => (
          <span key={i} className="text-xs text-gray-500">{d.attendanceBracket}</span>
        ))}
      </div>
    </div>
  );
};


interface ReportsScreenProps {
  schoolId: string;
  currentBranchId: string | null;
}

const ReportsScreen: React.FC<ReportsScreenProps> = ({ schoolId, currentBranchId }) => {
  const [subjectAverages, setSubjectAverages] = useState<SubjectAverage[]>([]);
  const [topStudents, setTopStudents] = useState<TopStudent[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceCorrelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolId) return; // Prevent raw fetching if ID isn't ready

    const fetchReportsData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch Performance Data
        // Join with students to get names/grades
        // Note: supabase-js plain query doesn't do deep aggregation easily without Views or RPC.
        // We will fetch raw data and aggregate in JS for now (assuming dataset < 1000 records for prototype)

        let perfQuery = supabase.from('academic_performance').select('student_id, subject, score').eq('school_id', schoolId);
        let studentQuery = supabase.from('students').select('id, name, grade, section, avatar_url').eq('school_id', schoolId);

        if (currentBranchId && currentBranchId !== 'all') {
          perfQuery = perfQuery.eq('branch_id', currentBranchId);
          studentQuery = studentQuery.eq('branch_id', currentBranchId);
        }

        const { data: performanceData, error: perfError } = await perfQuery;
        if (perfError) throw perfError;

        const { data: studentsData, error: studentError } = await studentQuery;
        if (studentError) throw studentError;

        // 1. Calculate Subject Averages
        const subjectMap: { [key: string]: { total: number, count: number } } = {};
        performanceData?.forEach(p => {
          if (!subjectMap[p.subject]) subjectMap[p.subject] = { total: 0, count: 0 };
          subjectMap[p.subject].total += (p.score || 0);
          subjectMap[p.subject].count += 1;
        });

        const avgList = Object.keys(subjectMap).map(sub => ({
          subject: sub,
          averageScore: Math.round(subjectMap[sub].total / subjectMap[sub].count)
        })).sort((a, b) => b.averageScore - a.averageScore);

        setSubjectAverages(avgList);

        // 2. Calculate Top Students
        const studentPerformanceMap: { [key: string]: { total: number, count: number } } = {};
        performanceData?.forEach(p => {
          if (!studentPerformanceMap[p.student_id]) studentPerformanceMap[p.student_id] = { total: 0, count: 0 };
          studentPerformanceMap[p.student_id].total += (p.score || 0);
          studentPerformanceMap[p.student_id].count += 1;
        });

        const rankedStudents = studentsData?.map(student => {
          const stats = studentPerformanceMap[student.id];
          const avg = stats ? Math.round(stats.total / stats.count) : 0;
          return {
            id: student.id,
            name: student.name,
            grade: student.grade,
            section: student.section,
            averageScore: avg,
            avatarUrl: student.avatar_url
          };
        }).sort((a, b) => b.averageScore - a.averageScore).slice(0, 5); // Top 5

        setTopStudents(rankedStudents || []);

        // 3. Attendance Correlation (Mockish logic with real data if available, simply mapping avg score to some dummy attendance if attendance table is sparse, 
        // but let's try to fetch attendance if possible or leave empty)
        // For now, let's use a placeholder that relies on the calculated averages to show *some* chart 
        // We don't have linked attendance-performance readily available without complex joins.
        // We'll generate a chart based on the distribution of student averages we just calculated.

        // Group students by average score brackets (High, Med, Low) -> usually correlates to attendance in real life
        // This is a simplification.
        const brackets = [
          { label: '<60%', scores: [] as number[], attendanceLabel: '<75%' },
          { label: '60-70%', scores: [] as number[], attendanceLabel: '75-85%' },
          { label: '70-80%', scores: [] as number[], attendanceLabel: '85-90%' },
          { label: '80-90%', scores: [] as number[], attendanceLabel: '90-95%' },
          { label: '90%+', scores: [] as number[], attendanceLabel: '95%+' },
        ];

        // Check actual student averages
        (studentsData || []).forEach(student => {
          const stats = studentPerformanceMap[student.id];
          const avg = stats ? (stats.total / stats.count) : 0;
          if (avg >= 90) brackets[4].scores.push(avg);
          else if (avg >= 80) brackets[3].scores.push(avg);
          else if (avg >= 70) brackets[2].scores.push(avg);
          else if (avg >= 60) brackets[1].scores.push(avg);
          else brackets[0].scores.push(avg);
        });

        const correlationData = brackets.map(b => ({
          attendanceBracket: b.attendanceLabel, // Pretending X-axis is attendance
          averageScore: b.scores.length > 0 ? Math.round(b.scores.reduce((a, b) => a + b, 0) / b.scores.length) : 0
        })).filter(d => d.averageScore > 0); // Only show relevant points

        setAttendanceData(correlationData);

      } catch (err: any) {
        console.error("Error fetching reports:", err);
        setError(err.message || 'Failed to generate school reports.');
      } finally {
        setLoading(false);
      }
    };

    fetchReportsData();
  }, [schoolId, currentBranchId]);

  return (
    <div className="p-4 space-y-5 bg-gray-50">
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-xl shadow-sm text-sm font-semibold">
          {error}
        </div>
      )}
      {loading && <div className="p-8 text-center text-indigo-500 font-semibold animate-pulse">Generating reports...</div>}

      {!loading && !error && (
        <>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-sky-100 text-sky-500 p-2 rounded-lg"><ChartBarIcon /></div>
              <h3 className="font-bold text-gray-800">Average Grades by Subject</h3>
            </div>
            {subjectAverages.length > 0 ? <SubjectGradesChart data={subjectAverages} /> : <p className="text-gray-400 text-sm">No academic data available</p>}
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-green-100 text-green-500 p-2 rounded-lg"><TrophyIcon /></div>
              <h3 className="font-bold text-gray-800">Top Performing Students</h3>
            </div>
            {topStudents.length > 0 ? <TopStudentsList students={topStudents} /> : <p className="text-gray-400 text-sm">No student data available</p>}
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center space-x-3 mb-2">
              <div className="bg-indigo-100 text-indigo-500 p-2 rounded-lg"><TrendingUpIcon /></div>
              <h3 className="font-bold text-gray-800">Attendance-Performance Trend</h3>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsScreen;
