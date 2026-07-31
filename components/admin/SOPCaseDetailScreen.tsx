import React from 'react';
import { motion } from 'framer-motion';
import SOPCaseDetailView from '../shared/SOPCaseDetailView';

interface SOPCaseDetailScreenProps {
    caseId: string;
}

const SOPCaseDetailScreen: React.FC<SOPCaseDetailScreenProps> = ({ caseId }) => {
    if (!caseId) return <div className="text-center py-12 text-gray-500">No case selected.</div>;
    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <SOPCaseDetailView caseId={caseId} mode="admin" />
        </motion.div>
    );
};

export default SOPCaseDetailScreen;
