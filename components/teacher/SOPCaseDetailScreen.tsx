import React from 'react';
import SOPCaseDetailView from '../shared/SOPCaseDetailView';

interface SOPCaseDetailScreenProps {
    caseId: string;
}

const SOPCaseDetailScreen: React.FC<SOPCaseDetailScreenProps> = ({ caseId }) => {
    if (!caseId) return <div className="text-center py-12 text-gray-500">No case selected.</div>;
    return <SOPCaseDetailView caseId={caseId} mode="teacher" />;
};

export default SOPCaseDetailScreen;
