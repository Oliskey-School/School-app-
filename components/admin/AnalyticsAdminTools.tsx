import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRightIcon } from '../../constants';

interface AnalyticsAdminToolsProps {
    navigateTo: (view: string, title: string, props?: any) => void;
    schoolId: string;
    currentBranchId: string | null;
}

const toolsCategories = [
    // ... same categories ...
];

const AnalyticsAdminTools: React.FC<AnalyticsAdminToolsProps> = ({ navigateTo, schoolId, currentBranchId }) => {
    return (
        <div className="p-4 space-y-3 bg-gray-50">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-xl p-6 text-white mb-4">
                <h2 className="text-2xl font-bold mb-2">📊 Analytics & Admin Tools</h2>
                <p className="text-teal-100">Advanced analytics, budgeting, and system integrations</p>
            </motion.div>

            {[
                {
                    view: 'attendanceHeatmap',
                    title: 'Attendance Heatmap',
                    description: 'Visual attendance tracking with trends',
                    icon: '📊',
                    color: 'text-blue-600 bg-blue-100'
                },
                {
                    view: 'financeDashboard',
                    title: 'Finance Dashboard',
                    description: 'Revenue, expenses, and forecasting',
                    icon: '💰',
                    color: 'text-green-600 bg-green-100'
                },
                {
                    view: 'academicAnalytics',
                    title: 'Academic Analytics',
                    description: 'Grade distribution and performance',
                    icon: '📚',
                    color: 'text-purple-600 bg-purple-100'
                },
                {
                    view: 'budgetPlanner',
                    title: 'Budget Planner',
                    description: 'Annual budgets and allocations',
                    icon: '💼',
                    color: 'text-indigo-600 bg-indigo-100'
                },
                {
                    view: 'auditTrailViewer',
                    title: 'Audit Trail',
                    description: 'Security monitoring and compliance',
                    icon: '🔒',
                    color: 'text-red-600 bg-red-100'
                },
                {
                    view: 'integrationHub',
                    title: 'Integration Hub',
                    description: 'WAEC, NECO, JAMB & third-party apps',
                    icon: '🔌',
                    color: 'text-teal-600 bg-teal-100'
                },
                {
                    view: 'vendorManagement',
                    title: 'Vendor Management',
                    description: 'Suppliers and purchase orders',
                    icon: '🚚',
                    color: 'text-orange-600 bg-orange-100'
                },
                {
                    view: 'assetInventory',
                    title: 'Asset Inventory',
                    description: 'Equipment tracking & QR codes',
                    icon: '📦',
                    color: 'text-cyan-600 bg-cyan-100'
                },
                {
                    view: 'scanAsset',
                    title: 'Scan Asset',
                    description: 'Scan a QR tag to view details',
                    icon: '📷',
                    color: 'text-cyan-700 bg-cyan-100'
                },
                {
                    view: 'privacyDashboard',
                    title: 'Privacy (NDPR)',
                    description: 'Data protection & consent',
                    icon: '🛡️',
                    color: 'text-slate-600 bg-slate-100'
                },
                {
                    view: 'complianceChecklist',
                    title: 'Compliance Checks',
                    description: 'Automated regulatory health',
                    icon: '✅',
                    color: 'text-emerald-600 bg-emerald-100'
                },
                {
                    view: 'maintenanceTickets',
                    title: 'Maintenance Tickets',
                    description: 'Repairs & issue tracking',
                    icon: '🔧',
                    color: 'text-rose-600 bg-rose-100'
                },
            ].map((tool, ti) => (
                <motion.button
                    key={tool.view}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(ti, 15) * 0.03 }}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => navigateTo(tool.view, tool.title, { schoolId, currentBranchId })}
                    className="w-full bg-white rounded-xl shadow-sm p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-lg ${tool.color} text-3xl`}>
                            {tool.icon}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800">{tool.title}</h3>
                            <p className="text-sm text-gray-500">{tool.description}</p>
                        </div>
                    </div>
                    <ChevronRightIcon className="text-gray-400" />
                </motion.button>
            ))}
        </div>
    );
};

export default AnalyticsAdminTools;
