import React, { useMemo } from 'react';
import { InspectionSchema } from '../../types/inspector';
import { motion } from 'framer-motion';

interface Props {
  schema: InspectionSchema;
  responses: Record<string, any>;
}

export const WSEScoreEngine: React.FC<Props> = ({ schema, responses }) => {
  const domainScores = useMemo(() => {
    return schema.sections.map(section => {
      let score = 0;
      let count = 0;
      section.fields.forEach(field => {
        const val = responses[field.id];
        if (field.type === 'score_slider' && typeof val === 'number') {
          score += val;
          count += field.max || 10;
        } else if (field.type === 'boolean' && val !== undefined) {
          score += val ? 10 : 0;
          count += 10;
        }
      });
      return {
        name: section.title,
        domain: section.domain,
        percent: count > 0 ? (score / count) * 100 : 0
      };
    });
  }, [schema, responses]);

  const overallRating = useMemo(() => {
    const avg = domainScores.reduce((acc, d) => acc + d.percent, 0) / (domainScores.length || 1);
    if (avg >= 90) return { label: 'Outstanding', color: 'text-emerald-400' };
    if (avg >= 75) return { label: 'Good', color: 'text-indigo-400' };
    if (avg >= 50) return { label: 'Satisfactory', color: 'text-amber-400' };
    if (avg >= 40) return { label: 'Requires Improvement', color: 'text-orange-400' };
    return { label: 'Inadequate', color: 'text-red-400' };
  }, [domainScores]);

  return (
    <div className="space-y-6">
       <div className="space-y-1">
          <span className="text-[10px] font-black uppercase text-white/30 tracking-widest">WSE Overall Performance</span>
          <div className="flex items-center justify-between">
             <span className={`text-2xl font-black ${overallRating.color}`}>{overallRating.label}</span>
             <span className="text-sm font-black text-white/70">WSE v2.1</span>
          </div>
       </div>

       <div className="space-y-4">
          {domainScores.map((domain, i) => (
            <div key={i} className="space-y-2">
               <div className="flex justify-between text-[10px] font-black uppercase text-white/60">
                  <span className="truncate max-w-[150px]">{domain.name}</span>
                  <span>{domain.percent.toFixed(0)}%</span>
               </div>
               <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${domain.percent}%` }}
                    className="h-full bg-indigo-500"
                  />
               </div>
            </div>
          ))}
       </div>

       <div className="pt-4 border-t border-white/5">
          <p className="text-[10px] text-white/30 italic leading-relaxed">
             * Ratings are calculated in real-time based on weighted domain performance markers.
          </p>
       </div>
    </div>
  );
};
