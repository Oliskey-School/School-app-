import React from 'react';
import { motion } from 'framer-motion';

const StudentDetailReport: React.FC = () => {
    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Student Detail Report</h2>
            <p className="text-gray-600">This report provides detailed information about a student's academic performance, attendance, and behavior.</p>
            <div className="mt-6 flex items-center justify-center p-12 border-2 border-dashed border-gray-200 rounded-lg">
                <p className="text-gray-400 font-medium">Report data visualization will appear here.</p>
            </div>
        </motion.div>
    );
};

export default StudentDetailReport;
