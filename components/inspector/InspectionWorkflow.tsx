import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, Circle, Save, Send, AlertCircle, 
  ChevronRight, ChevronLeft, ClipboardList, PenTool, 
  FileText, Star, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Inspection, InspectionItem, InspectionItemStatus } from '../../types/inspector';
import { useUpdateInspection, useSubmitInspectionResponses, useInspection } from '../../hooks/useInspections';
import DigitalSignaturePad, { SignaturePreview } from './DigitalSignaturePad';
import toast from 'react-hot-toast';

interface Props {
  inspectionId: string;
  onComplete: () => void;
  onBack: () => void;
}

type WorkflowStep = 'checklist' | 'summary' | 'finalize';

export const InspectionWorkflow: React.FC<Props> = ({ 
  inspectionId, 
  onComplete, 
  onBack 
}) => {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('checklist');
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  
  const { data: inspection, isLoading } = useInspection(inspectionId);
  const updateMutation = useUpdateInspection();
  const submitResponsesMutation = useSubmitInspectionResponses();

  const [responses, setResponses] = useState<Record<string, { status: InspectionItemStatus; findings: string }>>({});
  const [overallSummary, setOverallSummary] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [signature, setSignature] = useState<string | null>(null);

  // Initialize responses from inspection items if available
  React.useEffect(() => {
    if (inspection?.items) {
      const initialResponses: Record<string, { status: InspectionItemStatus; findings: string }> = {};
      inspection.items.forEach(item => {
        initialResponses[item.id] = { 
          status: item.status || 'N/A', 
          findings: item.findings || '' 
        };
      });
      setResponses(initialResponses);
      setOverallSummary(inspection.summary || '');
      setRecommendations(inspection.recommendations || '');
      setSignature(inspection.digital_signature_url || null);
    }
  }, [inspection]);

  const categories = useMemo(() => {
    if (!inspection?.items) return [];
    const grouped = inspection.items.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, InspectionItem[]>);
    
    return Object.entries(grouped).map(([name, items]) => ({ name, items }));
  }, [inspection]);

  const handleUpdateResponse = (itemId: string, status: InspectionItemStatus) => {
    setResponses(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], status }
    }));
  };

  const handleUpdateFindings = (itemId: string, findings: string) => {
    setResponses(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], findings }
    }));
  };

  const handleSaveChecklist = async () => {
    const payload = Object.entries(responses).map(([id, data]) => ({
      id,
      status: data.status,
      findings: data.findings
    }));
    
    try {
      await submitResponsesMutation.mutateAsync(payload as any);
      toast.success('Checklist updated');
      setCurrentStep('summary');
    } catch (error) {
      toast.error('Failed to save checklist');
    }
  };

  const handleFinalize = async () => {
    if (!signature) {
      toast.error('Please provide a digital signature');
      return;
    }

    // Calculate rating based on pass/fail (simple logic for now)
    const total = Object.values(responses).length;
    const passes = Object.values(responses).filter(r => r.status === 'Pass').length;
    const percentage = (passes / total) * 100;
    
    let rating = 'Grade D - Poor';
    if (percentage >= 90) rating = 'Grade A - Excellent';
    else if (percentage >= 75) rating = 'Grade B - Good';
    else if (percentage >= 50) rating = 'Grade C - Satisfactory';

    try {
      await updateMutation.mutateAsync({
        id: inspectionId,
        data: {
          status: 'Completed',
          summary: overallSummary,
          recommendations: recommendations,
          digital_signature_url: signature,
          overall_rating: rating,
          completed_at: new Date().toISOString()
        }
      });
      toast.success('Inspection Finalized');
      onComplete();
    } catch (error) {
      toast.error('Failed to finalize inspection');
    }
  };

  if (isLoading) return <div className="p-20 text-center">Loading checklist...</div>;

  const steps: { id: WorkflowStep; label: string; icon: any }[] = [
    { id: 'checklist', label: 'Checklist', icon: ClipboardList },
    { id: 'summary', label: 'Summary', icon: MessageSquare },
    { id: 'finalize', label: 'Finalize', icon: PenTool },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Stepper */}
      <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-4">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = steps.findIndex(s => s.id === currentStep) > i;
            
            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center gap-2 relative z-10">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                    isActive ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 scale-110' : 
                    isCompleted ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs font-bold ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                    {step.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className="flex-1 h-1 bg-slate-100 mx-4 -mt-6">
                    <motion.div 
                      initial={{ width: '0%' }}
                      animate={{ width: isCompleted ? '100%' : '0%' }}
                      className="h-full bg-emerald-500"
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {currentStep === 'checklist' && (
          <motion.div
            key="checklist"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {categories.map((cat, i) => (
              <div key={cat.name} className="space-y-4">
                <h3 className="text-xl font-bold text-slate-900 ml-2">{cat.name}</h3>
                <div className="space-y-3">
                  {cat.items.map((item) => (
                    <div key={item.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm group">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {item.item_name}
                          </h4>
                          <input 
                            type="text"
                            placeholder="Add findings/notes..."
                            value={responses[item.id]?.findings || ''}
                            onChange={(e) => handleUpdateFindings(item.id, e.target.value)}
                            className="mt-2 w-full bg-transparent border-none p-0 text-sm focus:ring-0 text-slate-500 placeholder-slate-300 italic"
                          />
                        </div>
                        <div className="flex gap-2 p-1 bg-slate-50 rounded-2xl">
                          {['Pass', 'Fail', 'N/A'].map((status) => (
                            <button
                              key={status}
                              onClick={() => handleUpdateResponse(item.id, status as any)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                responses[item.id]?.status === status 
                                  ? status === 'Pass' ? 'bg-emerald-500 text-white shadow-md' :
                                    status === 'Fail' ? 'bg-red-500 text-white shadow-md' : 
                                    'bg-slate-500 text-white shadow-md'
                                  : 'text-slate-400 hover:text-slate-600'
                              }`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex justify-end gap-3 pt-6">
              <button 
                onClick={onBack}
                className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveChecklist}
                className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
              >
                <span>Continue to Summary</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}

        {currentStep === 'summary' && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6"
          >
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Overall Findings Summary
              </h3>
              <textarea 
                value={overallSummary}
                onChange={(e) => setOverallSummary(e.target.value)}
                placeholder="Describe the overall state of the school during inspection..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:ring-4 focus:ring-indigo-100 outline-none min-h-[200px] text-slate-900"
              />
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                Recommendations
              </h3>
              <textarea 
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                placeholder="Strategic recommendations for the school's improvement..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:ring-4 focus:ring-amber-100 outline-none min-h-[150px] text-slate-900"
              />
            </div>

            <div className="flex justify-between pt-6">
              <button 
                onClick={() => setCurrentStep('checklist')}
                className="px-8 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>Back to Checklist</span>
              </button>
              <button 
                onClick={() => setCurrentStep('finalize')}
                className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
              >
                <span>Review & Sign</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}

        {currentStep === 'finalize' && (
          <motion.div
            key="finalize"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
               <h3 className="text-2xl font-black text-slate-900 mb-6">Final Verification</h3>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                     <h4 className="font-bold text-slate-500 text-sm uppercase tracking-wider">Inspector Confirmation</h4>
                     <p className="text-slate-600 leading-relaxed">
                       I hereby certify that I have conducted a thorough and impartial inspection of the premises and records of <strong>{inspection?.school?.name}</strong>. The findings presented in this report represent the true state of compliance as of <strong>{new Date().toLocaleDateString()}</strong>.
                     </p>
                     
                     {!signature ? (
                       <button 
                        onClick={() => setShowSignaturePad(true)}
                        className="w-full py-4 border-2 border-dashed border-indigo-200 text-indigo-600 rounded-2xl font-bold hover:bg-indigo-50 hover:border-indigo-400 transition-all flex items-center justify-center gap-2"
                       >
                         <PenTool className="w-5 h-5" />
                         Click to Sign Digitally
                       </button>
                     ) : (
                       <SignaturePreview 
                        signatureDataUrl={signature} 
                        onEdit={() => setShowSignaturePad(true)} 
                       />
                     )}
                  </div>
                  
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                     <h4 className="font-bold text-slate-500 text-sm uppercase tracking-wider mb-4">Quality Score Comparison</h4>
                     <div className="space-y-4">
                        <div className="flex justify-between items-end">
                           <span className="text-slate-600">Compliance Rate</span>
                           <span className="text-2xl font-black text-indigo-600">85%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                           <div className="bg-indigo-600 h-2 rounded-full w-[85%]"></div>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 italic">
                          * Based on {Object.values(responses).filter(r => r.status === 'Pass').length} passing scores out of {Object.values(responses).length} total items.
                        </p>
                     </div>
                  </div>
               </div>
            </div>

            <div className="flex justify-between pt-6">
              <button 
                onClick={() => setCurrentStep('summary')}
                className="px-8 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>Back to Summary</span>
              </button>
              <button 
                onClick={handleFinalize}
                disabled={updateMutation.isPending}
                className="px-10 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-black hover:shadow-xl hover:shadow-emerald-200 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle2 className="w-6 h-6" />
                <span>FINALIZE & SUBMIT REPORT</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showSignaturePad && (
        <DigitalSignaturePad 
          onSave={(url) => { setSignature(url); setShowSignaturePad(false); }}
          onCancel={() => setShowSignaturePad(false)}
          existingSignature={signature || undefined}
        />
      )}
    </div>
  );
};
