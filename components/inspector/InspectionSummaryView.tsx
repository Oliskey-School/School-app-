import React, { useMemo } from 'react';
import { 
  CheckCircle2, AlertTriangle, AlertCircle, 
  MapPin, Clock, Camera, FileText, Send 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EscalationBanner } from './EscalationBanner';
import { InspectionSchema, SchoolProfile } from '../../types/inspector';

interface Props {
  school: SchoolProfile;
  type: string;
  schema: InspectionSchema;
  responses: Record<string, any>;
  photos: Record<string, string[]>;
  onBack: () => void;
  onNext: () => void;
}

export const InspectionSummaryView: React.FC<Props> = ({ 
  school, 
  type, 
  schema, 
  responses, 
  photos, 
  onBack, 
  onNext 
}) => {
  // Detect critical violations (e.g. fields with IDs containing 'safeguarding' or 'violation')
  const criticalViolations = useMemo(() => {
    const violations: string[] = [];
    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        const val = responses[field.id];
        if ((field.id.includes('violation') || field.id.includes('safeguarding')) && val === true) {
          violations.push(field.label);
        }
      });
    });
    return violations;
  }, [schema, responses]);

  // Filter sections that have responses
  const summaryParts = schema.sections.map(section => ({
    title: section.title,
    fields: section.fields.filter(f => responses[f.id] !== undefined)
  })).filter(s => s.fields.length > 0);

  return (
    <div className="space-y-10">
      <div className="text-center max-w-3xl mx-auto space-y-2">
         <h2 className="text-4xl font-black text-slate-900 tracking-tight">Review Inspection Data</h2>
         <p className="text-slate-500 font-medium">Verify all recorded observations before final submission. This data will generate the official institutional report.</p>
      </div>

      <AnimatePresence>
        {criticalViolations.length > 0 && (
          <EscalationBanner violations={criticalViolations} />
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Metadata & Map */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl space-y-6">
              <div className="flex items-center gap-4">
                 <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                    <MapPin className="w-8 h-8" />
                 </div>
                 <div>
                    <h4 className="text-xl font-black text-slate-900">{school.name}</h4>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{type} Inspection</p>
                 </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-50">
                 <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 font-bold">START TIME</span>
                    <span className="text-slate-900 font-black flex items-center gap-2">
                       <Clock className="w-4 h-4 text-indigo-600" />
                       {new Date().toLocaleTimeString()}
                    </span>
                 </div>
                 <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 font-bold">TOTAL FIELDS</span>
                    <span className="text-slate-900 font-black">{Object.keys(responses).length}</span>
                 </div>
                 <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 font-bold">EVIDENCE PHOTOS</span>
                    <span className="text-slate-900 font-black text-indigo-600 flex items-center gap-2">
                       <Camera className="w-4 h-4" />
                       {Object.values(photos).flat().length}
                    </span>
                 </div>
              </div>
           </div>

           <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-white/40">
                 <AlertCircle className="w-5 h-5" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Protocol Check</span>
              </div>
              <p className="text-xs text-white/60 leading-relaxed font-medium italic">
                 "I certify that the information contained in this report is based on physical evidence and observations during the inspection visit."
              </p>
           </div>
        </div>

        {/* Right: Full Data Summary */}
        <div className="lg:col-span-8 space-y-8">
           {summaryParts.map((part, i) => (
             <div key={i} className="bg-white rounded-[3.5rem] border border-slate-100 shadow-xl overflow-hidden">
                <div className="px-10 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                   <h5 className="font-black text-slate-900 uppercase tracking-widest text-xs">{part.title}</h5>
                   <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="p-10 space-y-6">
                   {part.fields.map((field) => (
                     <div key={field.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-50 last:border-0 last:pb-0">
                        <div className="space-y-1">
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{field.label}</p>
                           <p className="text-lg font-black text-slate-900">
                              {typeof responses[field.id] === 'boolean' 
                                ? (responses[field.id] ? 'Yes' : 'No') 
                                : String(responses[field.id])}
                           </p>
                        </div>
                        {field.type === 'photo_capture' && responses[field.id]?.length > 0 && (
                          <div className="flex -space-x-4">
                             {responses[field.id].slice(0, 3).map((img: string, idx: number) => (
                               <div key={idx} className="w-14 h-14 rounded-xl border-4 border-white overflow-hidden bg-slate-100">
                                  <img src={img} className="w-full h-full object-cover" />
                               </div>
                             ))}
                          </div>
                        )}
                     </div>
                   ))}
                </div>
             </div>
           ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-10 px-10">
         <button
           onClick={onBack}
           className="px-10 py-5 bg-white border-2 border-slate-100 text-slate-600 rounded-[2rem] font-black text-lg transition-all hover:bg-slate-50"
         >
           Back to Items
         </button>

         <button
           onClick={onNext}
           className="px-12 py-5 bg-gradient-to-r from-indigo-600 to-blue-700 text-white rounded-[2rem] font-black text-lg transition-all shadow-2xl shadow-indigo-100 flex items-center gap-3 hover:scale-105 active:scale-95"
         >
           <span>Proceed to Completion</span>
           <Send className="w-6 h-6" />
         </button>
      </div>
    </div>
  );
};
