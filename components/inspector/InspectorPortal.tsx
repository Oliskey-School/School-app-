import React, { useState, lazy, Suspense } from 'react';
import InspectorDashboard from './InspectorDashboard';
import SchoolSearchScreen from './SchoolSearchScreen';
import InspectionChecklistScreen from './InspectionChecklistScreen';
import DigitalSignaturePad from './DigitalSignaturePad';
import InspectionReportPDF from './InspectionReportPDF';
import { supabase } from '../../lib/supabase';

interface InspectorPortalProps {
    inspectorId: string;
    onLogout: () => void;
}

type View =
    | 'dashboard'
    | 'schoolSearch'
    | 'schoolProfile'
    | 'newInspection'
    | 'inspectionChecklist'
    | 'signReport'
    | 'viewReport';

interface ViewState {
    view: View;
    props?: any;
}

export default function InspectorPortal({ inspectorId, onLogout }: InspectorPortalProps) {
    const [viewStack, setViewStack] = useState<ViewState[]>([{ view: 'dashboard' }]);
    const [loading, setLoading] = useState(false);

    const currentView = viewStack[viewStack.length - 1];

    const navigateTo = (view: View, props?: any) => {
        setViewStack([...viewStack, { view, props }]);
    };

    const goBack = () => {
        if (viewStack.length > 1) {
            setViewStack(viewStack.slice(0, -1));
        }
    };

    const resetToHome = () => {
        setViewStack([{ view: 'dashboard' }]);
    };

    // Handle school selection from search
    const handleSelectSchool = async (schoolId: number) => {
        setLoading(true);
        try {
            // Fetch full school data
            const { data: school } = await supabase
                .from('schools')
                .select('*')
                .eq('id', schoolId)
                .single();

            if (school) {
                navigateTo('schoolProfile', { school });
            }
        } catch (error) {
            console.error('Error loading school:', error);
        } finally {
            setLoading(false);
        }
    };

    // Start new inspection
    const handleStartInspection = async (schoolId: number) => {
        setLoading(true);
        try {
            // Create new inspection record
            const { data: inspection, error } = await supabase
                .from('inspections')
                .insert({
                    school_id: schoolId,
                    inspector_id: inspectorId,
                    inspection_date: new Date().toISOString().split('T')[0],
                    inspection_type: 'Annual',
                    status: 'In Progress',
                })
                .select()
                .single();

            if (error) throw error;

            if (inspection) {
                navigateTo('inspectionChecklist', {
                    inspectionId: inspection.id,
                    schoolId,
                });
            }
        } catch (error) {
            console.error('Error starting inspection:', error);
            alert('Failed to start inspection. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Complete inspection and show signature pad
    const handleCompleteChecklist = (inspectionId: string) => {
        navigateTo('signReport', { inspectionId });
    };

    // Save signature and generate report
    const handleSaveSignature = async (inspectionId: string, signatureDataUrl: string) => {
        setLoading(true);
        try {
            // Update inspection with signature
            await supabase
                .from('inspections')
                .update({
                    digitally_signed: true,
                    signature_timestamp: new Date().toISOString(),
                })
                .eq('id', inspectionId);

            // Update inspector's signature if not already set
            await supabase
                .from('inspectors')
                .update({
                    digital_signature: signatureDataUrl,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', inspectorId);

            // Navigate to report view
            navigateTo('viewReport', { inspectionId });
        } catch (error) {
            console.error('Error saving signature:', error);
            alert('Failed to save signature. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Loading overlay
    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl p-8 shadow-2xl">
                    <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-700 font-medium">Processing...</p>
                </div>
            </div>
        );
    }

    // Render current view
    return (
        <div className="min-h-screen">
            <Suspense fallback={<LoadingScreen />}>
                {currentView.view === 'dashboard' && (
                    <InspectorDashboard
                        inspectorId={inspectorId}
                        onNavigate={(view, props) => navigateTo(view as View, props)}
                    />
                )}

                {currentView.view === 'schoolSearch' && (
                    <SchoolSearchScreen
                        onSelectSchool={handleSelectSchool}
                        onBack={goBack}
                    />
                )}

                {currentView.view === 'inspectionChecklist' && (
                    <InspectionChecklistScreen
                        inspectionId={currentView.props.inspectionId}
                        schoolId={currentView.props.schoolId}
                        onComplete={() => handleCompleteChecklist(currentView.props.inspectionId)}
                        onBack={goBack}
                    />
                )}

                {currentView.view === 'signReport' && (
                    <DigitalSignaturePad
                        onSave={(signature) => handleSaveSignature(currentView.props.inspectionId, signature)}
                        onCancel={goBack}
                    />
                )}

                {currentView.view === 'viewReport' && (
                    <ReportViewer
                        inspectionId={currentView.props.inspectionId}
                        inspectorId={inspectorId}
                        onBack={resetToHome}
                    />
                )}
            </Suspense>
        </div>
    );
}

// Report Viewer Component
function ReportViewer({
    inspectionId,
    inspectorId,
    onBack
}: {
    inspectionId: string;
    inspectorId: string;
    onBack: () => void;
}) {
    const [inspection, setInspection] = useState<any>(null);
    const [school, setSchool] = useState<any>(null);
    const [inspector, setInspector] = useState<any>(null);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        fetchReportData();
    }, []);

    const fetchReportData = async () => {
        setLoading(true);
        try {
            // Fetch inspection
            const { data: inspectionData } = await supabase
                .from('inspections')
                .select('*, schools(*)')
                .eq('id', inspectionId)
                .single();

            if (inspectionData) {
                setInspection(inspectionData);
                setSchool(inspectionData.schools);
            }

            // Fetch inspector
            const { data: inspectorData } = await supabase
                .from('inspectors')
                .select('*')
                .eq('id', inspectorId)
                .single();

            if (inspectorData) {
                setInspector(inspectorData);
            }

            // Fetch checklist responses
            const { data: responses } = await supabase
                .from('inspection_responses')
                .select('*, inspection_checklist_templates(*)')
                .eq('inspection_id', inspectionId);

            if (responses) {
                // Group responses by category
                const categoriesMap: any = {};

                responses.forEach((response) => {
                    const template = response.inspection_checklist_templates;
                    if (!categoriesMap[template.id]) {
                        categoriesMap[template.id] = {
                            id: template.id,
                            title: template.title,
                            category: template.category,
                            questions: JSON.parse(JSON.stringify(template.questions)),
                            maxScore: 0,
                            currentScore: 0,
                        };
                    }

                    // Update question scores
                    const questionIndex = categoriesMap[template.id].questions.findIndex(
                        (q: any) => q.id === response.question_id
                    );

                    if (questionIndex >= 0) {
                        categoriesMap[template.id].questions[questionIndex].score = response.score;
                        categoriesMap[template.id].questions[questionIndex].notes = response.notes;
                        categoriesMap[template.id].currentScore += response.score;
                    }
                });

                // Calculate max scores
                Object.values(categoriesMap).forEach((cat: any) => {
                    cat.maxScore = cat.questions.reduce((sum: number, q: any) => sum + (q.max_points || 0), 0);
                });

                setCategories(Object.values(categoriesMap));
            }
        } catch (error) {
            console.error('Error fetching report data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <LoadingScreen />;
    }

    if (!inspection || !school || !inspector) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <p className="text-slate-600 mb-4">Report not found</p>
                    <button
                        onClick={onBack}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <InspectionReportPDF
            inspection={inspection}
            school={school}
            inspector={inspector}
            categories={categories}
            onDownload={onBack}
        />
    );
}

// Loading Screen
function LoadingScreen() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-600 font-medium">Loading...</p>
            </div>
        </div>
    );
}
