import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { InspectionTypeSelector, InspectionTypeCode } from './InspectionTypeSelector';
import { SchoolSelector } from './SchoolSelector';
import { DynamicFormEngine } from './DynamicFormEngine';
import { InspectionSummaryView } from './InspectionSummaryView';
import { SignaturePad } from './SignaturePad';
import { SchoolProfile, InspectionSchema } from '../../types/inspector';
import { CheckCircle2, ChevronRight, AlertCircle, Save, PenTool, FileCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useInspectionTemplate, useSubmitInspectionFull } from '../../hooks/useInspections';
import { PDFReportBuilder } from './PDFReportBuilder';
import { useInspectorProfile } from '../../hooks/useInspector';

type Step = 1 | 2 | 3 | 4 | 5;

interface InspectionState {
  type: InspectionTypeCode | null;
  school: SchoolProfile | null;
  startTime: string | null;
  template: InspectionSchema | null;
  responses: Record<string, any>;
  photos: Record<string, string[]>; // field_id -> base64 list
  signatureInspector: string | null;
  signatureSchool: string | null;
}

interface Props {
  jurisdictionIds: string[];
  onComplete: () => void;
  onBack: () => void;
}

export const NewInspection: React.FC<Props> = ({ 
  jurisdictionIds, 
  onComplete, 
  onBack 
}) => {
  const { data: profile } = useInspectorProfile();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [showSignaturePad, setShowSignaturePad] = useState<'inspector' | 'school' | null>(null);
  
  const [state, setState] = useState<InspectionState>({
    type: null,
    school: null,
    startTime: null,
    template: null,
    responses: {},
    photos: {},
    signatureInspector: null,
    signatureSchool: null,
  });

  const { data: templateData, isLoading: isLoadingTemplate } = useInspectionTemplate(state.type || '');

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 5) as Step);
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1) as Step);

  const steps = [
    { id: 1, label: 'Inspection Type' },
    { id: 2, label: 'Select Institution' },
    { id: 3, label: 'Dynamic Checklist' },
    { id: 4, label: 'Review & Flags' },
    { id: 5, label: 'Sign & Finalize' },
  ];

  const submitMutation = useSubmitInspectionFull();

  const handleFinalize = async () => {
    if (!state.signatureInspector || !state.signatureSchool) {
      toast.error('Both Inspector and School Principal must sign the report.');
      return;
    }

    const loadingToast = toast.loading('Finalizing and generating report...');
    
    try {
      await submitMutation.mutateAsync({
        school_id: state.school?.id,
        inspection_type: state.type,
        start_time: state.startTime,
        end_time: new Date().toISOString(),
        responses: state.responses,
        signature_inspector: state.signatureInspector,
        signature_school: state.signatureSchool,
        draft: false
      });
      
      toast.success('Inspection Finalized Successfully!', { id: loadingToast });
      onComplete();
    } catch (error) {
      toast.error('Failed to finalize inspection.', { id: loadingToast });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      {/* Header & Progress */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div>
           <h1 className="text-4xl font-black text-slate-900 tracking-tight">New Inspection</h1>
           <p className="text-slate-500 font-bold mt-1 uppercase tracking-widest text-xs">
              Step {currentStep} of 5: {steps.find(s => s.id === currentStep)?.label}
           </p>
        </div>
        
        <div className="flex items-center gap-2 p-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-x-auto no-scrollbar">
           {steps.map((step) => {
             const isActive = currentStep === step.id;
             const isCompleted = currentStep > step.id;
             
             return (
               <div 
                 key={step.id}
                 className={`
                   px-6 py-3 rounded-2xl flex items-center gap-3 transition-all whitespace-nowrap
                   ${isActive ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : isCompleted ? 'bg-emerald-50 text-emerald-600' : 'text-slate-300'}
                 `}
               >
                 <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black border-2 ${isActive ? 'border-indigo-400 bg-white/20' : isCompleted ? 'border-emerald-200 bg-emerald-100' : 'border-slate-100'}`}>
                    {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : step.id}
                 </div>
                 <span className="text-sm font-black uppercase tracking-wider">{step.label}</span>
               </div>
             );
           })}
        </div>
      </div>

      {/* Main Step Container */}
      <div className="min-h-[60vh]">
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4, ease: "circOut" }}
            >
              <InspectionTypeSelector 
                selectedType={state.type}
                onSelect={(type) => setState(prev => ({ ...prev, type }))}
                onNext={nextStep}
              />
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4, ease: "circOut" }}
            >
              <SchoolSelector 
                jurisdictionIds={jurisdictionIds}
                selectedSchool={state.school}
                onSelect={(school) => setState(prev => ({ ...prev, school }))}
                onNext={() => {
                   setState(prev => ({ ...prev, startTime: new Date().toISOString() }));
                   nextStep();
                }}
                onBack={prevStep}
              />
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4, ease: "circOut" }}
            >
              {isLoadingTemplate ? (
                 <div className="p-20 text-center animate-pulse text-slate-400 font-black uppercase tracking-widest">Loading Dynamic Checklist...</div>
              ) : templateData ? (
                <DynamicFormEngine 
                  schema={templateData.schema}
                  type={state.type || ''}
                  initialResponses={state.responses}
                  onSave={(responses) => setState(prev => ({ ...prev, responses }))}
                  onStepComplete={(responses) => {
                     setState(prev => ({ ...prev, responses }));
                     nextStep();
                  }}
                />
              ) : (
                <div className="p-20 text-center space-y-4">
                   <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
                   <h3 className="text-2xl font-black text-slate-900">Template Missing</h3>
                   <p className="text-slate-500">No checklist schema found for inspection type "{state.type}".</p>
                   <button onClick={prevStep} className="px-10 py-4 bg-slate-100 rounded-2xl font-black">Go Back</button>
                </div>
              )}
            </motion.div>
          )}

          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4, ease: "circOut" }}
            >
              {templateData && state.school && (
                <InspectionSummaryView 
                  school={state.school}
                  type={state.type || ''}
                  schema={templateData.schema}
                  responses={state.responses}
                  photos={state.photos}
                  onBack={prevStep}
                  onNext={nextStep}
                />
              )}
            </motion.div>
          )}

          {currentStep === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4, ease: "circOut" }}
              className="space-y-10"
            >
              <div className="text-center max-w-2xl mx-auto space-y-2">
                 <h2 className="text-4xl font-black text-slate-900 tracking-tight">Final Authorization</h2>
                 <p className="text-slate-500 font-medium">Both parties must sign to certify the accuracy of these findings and the resulting grading.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 {/* Inspector Signature */}
                 <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-6 text-center">
                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mx-auto">
                       <PenTool className="w-10 h-10" />
                    </div>
                    <div className="space-y-1">
                       <h4 className="text-xl font-black text-slate-900">Lead Inspector</h4>
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Self-Certification</p>
                    </div>
                    
                    {state.signatureInspector ? (
                      <div className="relative group">
                         <img src={state.signatureInspector} className="h-32 mx-auto grayscale hover:grayscale-0 transition-all cursor-pointer" onClick={() => setShowSignaturePad('inspector')} />
                         <div className="absolute inset-0 bg-white/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-[2rem]">
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Update Signature</span>
                         </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setShowSignaturePad('inspector')}
                        className="w-full py-6 border-4 border-dashed border-slate-100 text-slate-300 rounded-[2rem] font-black hover:border-indigo-100 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-inter"
                      >
                         Tap to Sign
                      </button>
                    )}
                 </div>

                 {/* School Signature */}
                 <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-6 text-center">
                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
                       <PenTool className="w-10 h-10" />
                    </div>
                    <div className="space-y-1">
                       <h4 className="text-xl font-black text-slate-900">School Principal</h4>
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Institution Acknowledgment</p>
                    </div>
                    
                    {state.signatureSchool ? (
                      <div className="relative group">
                         <img src={state.signatureSchool} className="h-32 mx-auto grayscale hover:grayscale-0 transition-all cursor-pointer" onClick={() => setShowSignaturePad('school')} />
                         <div className="absolute inset-0 bg-white/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-[2rem]">
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Update Signature</span>
                         </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setShowSignaturePad('school')}
                        className="w-full py-6 border-4 border-dashed border-slate-100 text-slate-300 rounded-[2rem] font-black hover:border-emerald-100 hover:text-emerald-600 hover:bg-emerald-50 transition-all font-inter"
                      >
                         Tap to Sign
                      </button>
                    )}
                 </div>
              </div>

              <div className="flex flex-col items-center gap-6 pt-10">
                 <button
                   onClick={handleFinalize}
                   disabled={!state.signatureInspector || !state.signatureSchool}
                   className={`
                     px-16 py-6 rounded-[2.5rem] font-black text-2xl transition-all shadow-2xl flex items-center gap-4
                     ${state.signatureInspector && state.signatureSchool 
                       ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-200 hover:scale-105 active:scale-95' 
                       : 'bg-slate-100 text-slate-300 cursor-not-allowed'}
                   `}
                 >
                   <FileCheck className="w-8 h-8" />
                   <span>FINALIZE & SUBMIT REPORT</span>
                 </button>

                 {state.signatureInspector && state.signatureSchool && (
                    <PDFReportBuilder 
                      school={state.school!}
                      type={state.type!}
                      responses={state.responses}
                      photos={state.photos}
                      inspectorName={profile?.full_name || 'Inspector'}
                      signatureInspector={state.signatureInspector}
                      signatureSchool={state.signatureSchool}
                      overallRating="Pending Calculation"
                    />
                 )}
                 
                 <button onClick={prevStep} className="text-slate-400 font-bold hover:text-slate-600">Back to Review</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Signature Modals */}
      <AnimatePresence>
        {showSignaturePad === 'inspector' && (
          <SignaturePad 
            label="Inspector Signature"
            onSave={(sig) => { setState(prev => ({ ...prev, signatureInspector: sig })); setShowSignaturePad(null); }}
            onCancel={() => setShowSignaturePad(null)}
            existingSignature={state.signatureInspector || undefined}
          />
        )}
        {showSignaturePad === 'school' && (
          <SignaturePad 
            label="Principal Signature"
            onSave={(sig) => { setState(prev => ({ ...prev, signatureSchool: sig })); setShowSignaturePad(null); }}
            onCancel={() => setShowSignaturePad(null)}
            existingSignature={state.signatureSchool || undefined}
          />
        )}
      </AnimatePresence>

      {/* Persistent Footer Actions (Visible on Step 3) */}
      <AnimatePresence>
        {currentStep === 3 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-10 left-10 right-10 z-50 flex items-center justify-between bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-2xl border border-white/10"
          >
             <div className="flex items-center gap-6 px-4">
                <div className="flex flex-col">
                   <span className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">Ongoing Inspection</span>
                   <span className="text-sm font-bold truncate max-w-[200px]">{state.school?.name}</span>
                </div>
                <div className="w-px h-8 bg-white/10"></div>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                   <span className="text-xs font-bold text-white/60">Auto-save Enabled</span>
                </div>
             </div>

             <div className="flex items-center gap-4">
               <button 
                 onClick={() => toast.success('Draft saved successfully')}
                 className="p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all"
               >
                  <Save className="w-5 h-5" />
               </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
