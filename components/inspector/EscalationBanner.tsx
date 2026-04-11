import React from 'react';
import { ShieldAlert, AlertTriangle, ArrowUpCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  violations: string[];
}

export const EscalationBanner: React.FC<Props> = ({ violations }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-red-50 border-4 border-red-200 rounded-[3rem] p-10 flex flex-col md:flex-row items-center gap-10 shadow-2xl shadow-red-100"
    >
      <div className="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center text-white shadow-xl shadow-red-200 shrink-0">
         <ShieldAlert className="w-12 h-12" />
      </div>

      <div className="flex-1 space-y-4">
         <div className="space-y-1">
            <h3 className="text-2xl font-black text-red-900">Critical Violations Detected</h3>
            <p className="text-red-600 font-bold">This inspection has triggered an automatic escalation to the Ministry of Education.</p>
         </div>
         
         <div className="flex flex-wrap gap-2">
            {violations.map((v, i) => (
              <span key={i} className="px-4 py-2 bg-red-100 text-red-700 rounded-xl text-xs font-black uppercase tracking-wider border border-red-200 flex items-center gap-2">
                 <AlertTriangle className="w-3.5 h-3.5" />
                 {v}
              </span>
            ))}
         </div>
      </div>

      <div className="flex flex-col items-center gap-2 text-red-900">
         <ArrowUpCircle className="w-10 h-10 animate-bounce" />
         <span className="text-[10px] font-black uppercase tracking-widest">Escalating...</span>
      </div>
    </motion.div>
  );
};
