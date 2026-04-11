import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { InspectionSchema, InspectionField } from '../../types/inspector';
import { FormFieldRenderer } from './FormFieldRenderer';
import { WSEScoreEngine } from './WSEScoreEngine';
import { GAPSGradingEngine } from './GAPSGradingEngine';
import { 
  ChevronRight, ChevronLeft, 
  CheckCircle2, Info, AlertTriangle, 
  Save, Layout 
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  schema: InspectionSchema;
  type: string;
  initialResponses?: Record<string, any>;
  onSave?: (responses: Record<string, any>) => void;
  onStepComplete?: (responses: Record<string, any>) => void;
}

export const DynamicFormEngine: React.FC<Props> = ({ 
  schema, 
  type, 
  initialResponses = {}, 
  onSave, 
  onStepComplete 
}) => {
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>(initialResponses);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const activeSection = schema.sections[activeSectionIdx];
  const isFirstSection = activeSectionIdx === 0;
  const isLastSection = activeSectionIdx === schema.sections.length - 1;

  // Logic to determine if a field should be visible based on conditional rules
  const isFieldVisible = (field: InspectionField) => {
    if (!field.hidden_by_default) return true;
    
    // Check if any other field's on_fail or on_value triggers this field
    return schema.sections.some(section => 
       section.fields.some(f => {
          const val = responses[f.id];
          if (f.on_fail && val === false && f.on_fail.show_fields.includes(field.id)) return true;
          if (f.on_value && val === f.on_value.value && f.on_value.show_fields.includes(field.id)) return true;
          return false;
       })
    );
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setResponses(prev => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      const newErrors = { ...errors };
      delete newErrors[fieldId];
      setErrors(newErrors);
    }
  };

  const validateSection = () => {
    const newErrors: Record<string, string> = {};
    activeSection.fields.forEach(field => {
      if (field.required && isFieldVisible(field) && (responses[field.id] === undefined || responses[field.id] === null || responses[field.id] === '')) {
        newErrors[field.id] = 'This field is required';
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Please complete all required fields in this section');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateSection()) {
      if (isLastSection) {
        onStepComplete?.(responses);
      } else {
        setActiveSectionIdx(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handlePrev = () => {
    setActiveSectionIdx(prev => prev - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Auto-save logic every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      onSave?.(responses);
    }, 30000);
    return () => clearInterval(timer);
  }, [responses, onSave]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
      {/* Sidebar: Navigation */}
      <div className="lg:col-span-3 space-y-6">
         <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-6">
            <div className="flex items-center gap-3 text-indigo-600 mb-2">
               <Layout className="w-6 h-6" />
               <span className="text-sm font-black uppercase tracking-widest">Inspection Sections</span>
            </div>
            <div className="space-y-4">
               {schema.sections.map((section, idx) => (
                 <button
                   key={section.id}
                   onClick={() => setActiveSectionIdx(idx)}
                   className={`
                     w-full p-4 rounded-2xl text-left border-2 transition-all flex items-center justify-between group
                     ${activeSectionIdx === idx 
                       ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                       : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-100 hover:text-indigo-600'}
                   `}
                 >
                   <div className="flex flex-col">
                      <span className={`text-[9px] font-black uppercase tracking-widest leading-none mb-1 ${activeSectionIdx === idx ? 'text-white/50' : 'text-slate-300'}`}>Part {idx + 1}</span>
                      <span className="text-xs font-black truncate max-w-[120px]">{section.title}</span>
                   </div>
                   {activeSectionIdx > idx && <CheckCircle2 className={`w-4 h-4 ${activeSectionIdx === idx ? 'text-white' : 'text-emerald-500'}`} />}
                 </button>
               ))}
            </div>
         </div>

         {/* Helper: Scoring Engine Preview */}
         <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl space-y-6 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            {type === 'WSE' ? (
              <WSEScoreEngine schema={schema} responses={responses} />
            ) : (
              <GAPSGradingEngine schema={schema} responses={responses} />
            )}
         </div>
      </div>

      {/* Main Form Area */}
      <div className="lg:col-span-9 space-y-10">
         <AnimatePresence mode="wait">
            <motion.div
              key={activeSection.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-8"
            >
               <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">{activeSection.title}</h3>
                    <p className="text-slate-500 font-medium">Please provide accurate verification responses and capture evidence where required.</p>
                  </div>
                  <div className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black uppercase tracking-widest border border-indigo-100">
                     Domain: {activeSection.domain || 'Core Performance'}
                  </div>
               </div>

               <div className="grid grid-cols-1 gap-8">
                  {activeSection.fields.filter(isFieldVisible).map((field) => (
                    <div key={field.id} className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-xl shadow-slate-100/30 space-y-6 transition-all hover:shadow-2xl hover:shadow-indigo-50">
                       <div className="flex items-start justify-between gap-4">
                          <label className="text-lg font-black text-slate-900 leading-snug max-w-2xl">
                             {field.label}
                             {field.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          <Info className="w-5 h-5 text-slate-200 mt-1 cursor-help hover:text-indigo-400 transition-colors" />
                       </div>
                       
                       <FormFieldRenderer 
                         field={field}
                         value={responses[field.id]}
                         onChange={(val) => handleFieldChange(field.id, val)}
                         error={errors[field.id]}
                       />

                       {errors[field.id] && (
                         <div className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl border border-red-100">
                           <AlertTriangle className="w-4 h-4" />
                           {errors[field.id]}
                         </div>
                       )}
                    </div>
                  ))}
               </div>

               {/* Navigation Controls */}
               <div className="flex items-center justify-between pt-10">
                  <button
                    onClick={handlePrev}
                    disabled={isFirstSection}
                    className={`
                      px-10 py-5 rounded-3xl font-black text-lg transition-all flex items-center gap-3
                      ${isFirstSection ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-white border-2 border-slate-100 text-slate-600 hover:bg-slate-50'}
                    `}
                  >
                    <ChevronLeft className="w-6 h-6" />
                    <span>Previous Section</span>
                  </button>

                  <button
                    onClick={handleNext}
                    className="px-12 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-3xl font-black text-lg transition-all flex items-center gap-3 shadow-2xl shadow-indigo-100 hover:scale-105 active:scale-95"
                  >
                    <span>{isLastSection ? 'Review Summary' : 'Next Section'}</span>
                    <ChevronRight className="w-6 h-6" />
                  </button>
               </div>
            </motion.div>
         </AnimatePresence>
      </div>
    </div>
  );
};
