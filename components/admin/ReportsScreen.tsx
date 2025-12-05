

import React from 'react';
import { ChartBarIcon, TrophyIcon, TrendingUpIcon, SUBJECT_COLORS, gradeColors } from '../../constants';
import { mockSubjectAverages, mockTopStudents, mockAttendanceCorrelation } from '../../data';
import { StudentPerformanceData } from '../../types';

const SubjectGradesChart = () => {
  const maxValue = 100;
  return (
    <div className="space-y-2">
      {mockSubjectAverages.map(item => {
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

const TopStudentsList = () => {
  return (
    <div className="space-y-3">
      {mockTopStudents.map((student, index) => (
        <div key={student.id} className="bg-gray-50 p-3 rounded-lg flex items-center space-x-3">
          <img src={student.avatarUrl} alt={student.name} className="w-12 h-12 rounded-full object-cover"/>
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

const AttendanceCorrelationChart = () => {
    const width = 280;
    const height = 120;
    const padding = 20;
    const maxValue = 100;
    const data = mockAttendanceCorrelation;
    const stepX = (width - padding * 2) / (data.length - 1);
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


const ReportsScreen: React.FC = () => {
  return (
    <div className="p-4 space-y-5 bg-gray-50">
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-sky-100 text-sky-500 p-2 rounded-lg"><ChartBarIcon /></div>
          <h3 className="font-bold text-gray-800">Average Grades by Subject</h3>
        </div>
        <SubjectGradesChart />
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-green-100 text-green-500 p-2 rounded-lg"><TrophyIcon /></div>
          <h3 className="font-bold text-gray-800">Top Performing Students</h3>
        </div>
        <TopStudentsList />
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex items-center space-x-3 mb-2">
          <div className="bg-indigo-100 text-indigo-500 p-2 rounded-lg"><TrendingUpIcon /></div>
          <h3 className="font-bold text-gray-800">Attendance-Performance Correlation</h3>
        </div>
        <AttendanceCorrelationChart />
      </div>
    </div>
  );
};

export default ReportsScreen;
