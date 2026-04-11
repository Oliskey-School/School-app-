import React, { useMemo } from 'react';
import { InspectionSchema } from '../../types/inspector';
import { motion } from 'framer-motion';

interface Props {
  schema: InspectionSchema;
  responses: Record<string, any>;
}

export const GAPSGradingEngine: React.FC<Props> = ({ schema, responses }) => {
  const { totalScore, maxPossible, sipItemsCount } = useMemo(() => {
    let total = 0;
    let max = 0;
    let sip = 0;
    
    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        const val = responses[field.id];
        if (field.type === 'boolean') {
          max += 10;
          if (val === true) total += 10;
          else if (val === false) sip += 1;
        } else if (field.type === 'number' || field.type === 'score_slider') {
          max += field.max || 10;
          total += typeof val === 'number' ? val : 0;
          if (typeof val === 'number' && val < (field.max || 10) / 2) sip += 1;
        }
      });
    });

    return { totalScore: total, maxPossible: max, sipItemsCount: sip };
  }, [schema, responses]);

  const percent = maxPossible > 0 ? (totalScore / maxPossible) * 100 : 0;

  const grading = useMemo(() => {
    if (percent >= 80) return { grade: 'A', label: 'Excellent', color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
    if (percent >= 60) return { grade: 'B', label: 'Good', color: 'text-indigo-400', bg: 'bg-indigo-500/10' };
    if (percent >= 40) return { grade: 'C', label: 'Satisfactory', color: 'text-amber-400', bg: 'bg-amber-500/10' };
    return { grade: 'D', label: 'Poor', color: 'text-red-400', bg: 'bg-red-500/10' };
  }, [percent]);

  return (
    <div className="space-y-8">
       <div className="text-center space-y-2">
          <span className="text-[10px] font-black uppercase text-white/30 tracking-widest">GAPS GAPS Percentage</span>
          <div className="text-5xl font-black">{percent.toFixed(1)}%</div>
       </div>

       <div className={`p-6 rounded-3xl border border-white/5 ${grading.bg} flex items-center justify-between`}>
          <div className="space-y-1">
             <span className="text-[10px] font-black uppercase text-white/40 tracking-wider">Current Grade</span>
             <div className="flex items-center gap-2">
                <span className={`text-3xl font-black ${grading.color}`}>{grading.grade}</span>
                <span className="text-xs font-bold text-white/60">{grading.label}</span>
             </div>
          </div>
          <div className="w-12 h-12 rounded-full border-4 border-white/10 flex items-center justify-center font-black text-xl text-white/20">
             {grading.grade}
          </div>
       </div>

       <div className="grid grid-cols-1 gap-4">
          <div className="flex justify-between items-center px-4 py-3 bg-white/5 rounded-2xl">
             <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Auto-SIP Flags</span>
             <span className="px-2 py-0.5 bg-red-500 rounded text-[10px] font-black text-white">{sipItemsCount}</span>
          </div>
          <p className="text-[9px] text-white/20 italic text-center px-4">
             "Failed or low-score items are automatically flagged for the School Improvement Plan (SIP)."
          </p>
       </div>

       <div className="pt-2">
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${percent}%` }}
               className={`h-full ${percent >= 80 ? 'bg-emerald-500' : percent >= 40 ? 'bg-indigo-500' : 'bg-red-500'}`}
             />
          </div>
       </div>
    </div>
  );
};
