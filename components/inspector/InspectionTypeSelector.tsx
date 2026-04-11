import React from 'react';
import { 
  ClipboardList, Calendar, Award, Building, 
  ShieldCheck, RefreshCw, AlertTriangle, Clock 
} from 'lucide-react';
import { motion } from 'framer-motion';

export type InspectionTypeCode = 'routine' | 'resumption' | 'SRI' | 'WSE' | 'GAPS' | 'follow_through' | 'incident';

interface InspectionType {
  id: InspectionTypeCode;
  name: string;
  description: string;
  duration: string;
  icon: any;
  color: string;
}

const INSPECTION_TYPES: InspectionType[] = [
  {
    id: 'routine',
    name: 'Routine Monitoring',
    description: 'Standard periodic visit to assess general school operations.',
    duration: '2-3 Hours',
    icon: ClipboardList,
    color: 'bg-blue-50 text-blue-600 border-blue-100',
  },
  {
    id: 'resumption',
    name: 'Resumption Monitoring',
    description: 'Conducted on school resumption date to verify readiness.',
    duration: '1-2 Hours',
    icon: Calendar,
    color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  },
  {
    id: 'SRI',
    name: 'Subject Recognition (SRI)',
    description: 'Accreditation for WAEC / NECO / BECE examinations.',
    duration: '4-6 Hours',
    icon: Award,
    color: 'bg-purple-50 text-purple-600 border-purple-100',
  },
  {
    id: 'WSE',
    name: 'Whole School Evaluation (WSE)',
    description: 'Full 8-domain comprehensive evaluation of the institution.',
    duration: '2-3 Days',
    icon: Building,
    color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  },
  {
    id: 'GAPS',
    name: 'GAPS Assessment',
    description: 'Graded Assessment Programme for private schools (Grade A–D).',
    duration: '1 Day',
    icon: ShieldCheck,
    color: 'bg-amber-50 text-amber-600 border-amber-100',
  },
  {
    id: 'follow_through',
    name: 'Follow-Through Evaluation',
    description: 'Revisit to verify corrective action compliance from previous SIP.',
    duration: '2 Hours',
    icon: RefreshCw,
    color: 'bg-teal-50 text-teal-600 border-teal-100',
  },
  {
    id: 'incident',
    name: 'Incident Investigation',
    description: 'Triggered by reported violation, safeguarding concern, or emergency.',
    duration: 'Variable',
    icon: AlertTriangle,
    color: 'bg-red-50 text-red-600 border-red-100',
  },
];

interface Props {
  selectedType: InspectionTypeCode | null;
  onSelect: (type: InspectionTypeCode) => void;
  onNext: () => void;
}

export const InspectionTypeSelector: React.FC<Props> = ({ 
  selectedType, 
  onSelect, 
  onNext 
}) => {
  return (
    <div className="space-y-8">
      <div className="text-center max-w-2xl mx-auto space-y-2">
         <h2 className="text-3xl font-black text-slate-900 tracking-tight">Select Inspection Type</h2>
         <p className="text-slate-500 font-medium">Choose the purpose of your visit. This will determine the dynamic checklist and grading engine used.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {INSPECTION_TYPES.map((type, idx) => {
          const isSelected = selectedType === type.id;
          const Icon = type.icon;
          
          return (
            <motion.div
              key={type.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => onSelect(type.id)}
              className={`
                relative p-8 rounded-[2.5rem] border-4 cursor-pointer transition-all duration-300 group
                ${isSelected 
                  ? 'border-indigo-600 bg-white shadow-2xl shadow-indigo-100 ring-8 ring-indigo-50' 
                  : 'border-white bg-white hover:border-slate-100 shadow-xl shadow-slate-100/50 hover:-translate-y-1'
                }
              `}
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${type.color}`}>
                 <Icon className="w-8 h-8" />
              </div>
              
              <h3 className="text-xl font-black text-slate-900 mb-3 uppercase tracking-tight">{type.name}</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-6 font-medium">
                {type.description}
              </p>
              
              <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
                 <Clock className="w-4 h-4" />
                 <span>EST. {type.duration}</span>
              </div>

              {isSelected && (
                <div className="absolute top-6 right-6">
                   <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg">
                      <ShieldCheck className="w-5 h-5" />
                   </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="flex justify-center pt-8">
         <button
           onClick={onNext}
           disabled={!selectedType}
           className={`
             px-12 py-5 rounded-3xl font-black text-lg transition-all flex items-center gap-3
             ${selectedType 
               ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-100 hover:bg-indigo-500 hover:scale-105 active:scale-95' 
               : 'bg-slate-100 text-slate-400 cursor-not-allowed'}
           `}
         >
           <span>Next: Select School</span>
           <ClipboardList className="w-6 h-6" />
         </button>
      </div>
    </div>
  );
};
