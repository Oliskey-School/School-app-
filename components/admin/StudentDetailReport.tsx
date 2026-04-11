import React from 'react';

const StudentDetailReport: React.FC = () => {
    return (
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Student Detail Report</h2>
            <p className="text-gray-600">This report provides detailed information about a student's academic performance, attendance, and behavior.</p>
            <div className="mt-6 flex items-center justify-center p-12 border-2 border-dashed border-gray-200 rounded-lg">
                <p className="text-gray-400 font-medium">Report data visualization will appear here.</p>
            </div>
        </div>
    );
};

export default StudentDetailReport;
