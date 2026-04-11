import React, { useState } from 'react';
import { 
  Building, Search, MapPin, Star, AlertCircle, 
  CheckCircle2, AlertTriangle, Users, BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSchoolsDirectory } from '../../hooks/useSchools';
import { SchoolProfile } from '../../types/inspector';

interface Props {
  jurisdictionIds: string[];
  selectedSchool: SchoolProfile | null;
  onSelect: (school: SchoolProfile) => void;
  onNext: () => void;
  onBack: () => void;
}

export const SchoolSelector: React.FC<Props> = ({ 
  jurisdictionIds, 
  selectedSchool, 
  onSelect, 
  onNext, 
  onBack 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: schools, isLoading } = useSchoolsDirectory(jurisdictionIds, { search: searchTerm });

  return (
    <div className="space-y-8">
      <div className="text-center max-w-2xl mx-auto space-y-2">
         <h2 className="text-3xl font-black text-slate-900 tracking-tight">Select Institution</h2>
         <p className="text-slate-500 font-medium">Find the school you are visiting today. Only schools within your jurisdiction are shown.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Search & List */}
        <div className="lg:col-span-12 xl:col-span-8 space-y-6">
          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors w-6 h-6" />
            <input 
              type="text"
              placeholder="Search by name, LGA, or Registration Number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border-2 border-slate-100 rounded-3xl py-6 pl-16 pr-8 text-lg font-bold focus:border-indigo-600 focus:ring-8 focus:ring-indigo-50 outline-none transition-all shadow-xl shadow-slate-100/50"
            />
          </div>

          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden min-h-[400px]">
             {isLoading ? (
               <div className="p-20 text-center animate-pulse text-slate-400 font-black uppercase tracking-widest">Searching Institutions...</div>
             ) : (
               <div className="divide-y divide-slate-50">
                 {schools?.map((school) => (
                   <div 
                     key={school.id}
                     onClick={() => onSelect(school)}
                     className={`
                       p-8 flex items-center justify-between cursor-pointer transition-all
                       ${selectedSchool?.id === school.id ? 'bg-indigo-50 border-l-8 border-indigo-600' : 'hover:bg-slate-50'}
                     `}
                   >
                     <div className="flex items-center gap-6">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${selectedSchool?.id === school.id ? 'bg-white text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                           <Building className="w-7 h-7" />
                        </div>
                        <div>
                           <h4 className="text-xl font-black text-slate-900">{school.name}</h4>
                           <div className="flex items-center gap-4 text-sm font-bold text-slate-500 mt-1">
                              <span className="flex items-center gap-1">
                                 <MapPin className="w-3.5 h-3.5" />
                                 {school.lga || 'Ikeja'}
                              </span>
                              <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] uppercase tracking-wider">{school.curriculum_type || 'Nigerian'}</span>
                           </div>
                        </div>
                     </div>
                     <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                           <span className="block text-[10px] font-black text-slate-400 uppercase mb-1">GAPS Grade</span>
                           <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-900">
                              GRADE {school.gaps_grade || 'U'}
                           </span>
                        </div>
                        {selectedSchool?.id === school.id ? (
                           <CheckCircle2 className="w-8 h-8 text-indigo-600" />
                        ) : (
                           <div className="w-8 h-8 rounded-full border-2 border-slate-100"></div>
                        )}
                     </div>
                   </div>
                 ))}
                 {schools?.length === 0 && (
                   <div className="p-20 text-center space-y-4">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                         <Search className="w-8 h-8" />
                      </div>
                      <p className="text-slate-400 font-bold">No schools found matching "{searchTerm}"</p>
                   </div>
                 )}
               </div>
             )}
          </div>
        </div>

        {/* Right: Summary Panel */}
        <div className="lg:col-span-12 xl:col-span-4 h-fit sticky top-8">
           <AnimatePresence mode="wait">
             {selectedSchool ? (
               <motion.div
                 key="summary"
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.95 }}
                 className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl space-y-8"
               >
                  <div className="space-y-2">
                     <h3 className="text-2xl font-black">{selectedSchool.name}</h3>
                     <p className="text-white/50 font-bold uppercase tracking-widest text-[10px]">{selectedSchool.registration_number || 'REG: LAG-2026-004'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-5 bg-white/5 rounded-3xl border border-white/5 space-y-1">
                        <span className="text-[9px] font-black uppercase text-white/40 tracking-wider">Enrolment</span>
                        <div className="flex items-center gap-2">
                           <Users className="w-3.5 h-3.5 text-indigo-400" />
                           <span className="font-black text-xl">{selectedSchool.enrolment_total || '1,240'}</span>
                        </div>
                     </div>
                     <div className="p-5 bg-white/5 rounded-3xl border border-white/5 space-y-1">
                        <span className="text-[9px] font-black uppercase text-white/40 tracking-wider">Risk Level</span>
                        <div className="flex items-center gap-2">
                           {selectedSchool.risk_level === 'High' ? <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> : <Star className="w-3.5 h-3.5 text-emerald-400" />}
                           <span className={`font-black text-xl ${selectedSchool.risk_level === 'High' ? 'text-red-400' : 'text-emerald-400'}`}>{selectedSchool.risk_level || 'Low'}</span>
                        </div>
                     </div>
                     <div className="p-5 bg-white/5 rounded-3xl border border-white/5 space-y-1">
                        <span className="text-[9px] font-black uppercase text-white/40 tracking-wider">GAPS Grade</span>
                        <div className="flex items-center gap-2">
                           <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                           <span className="font-black text-xl text-amber-400">{selectedSchool.gaps_grade || 'A'}</span>
                        </div>
                     </div>
                     <div className="p-5 bg-white/5 rounded-3xl border border-white/5 space-y-1">
                        <span className="text-[9px] font-black uppercase text-white/40 tracking-wider">Pending SIP</span>
                        <div className="flex items-center gap-2">
                           <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                           <span className="font-black text-xl text-red-400">3</span>
                        </div>
                     </div>
                  </div>

                  <button
                    onClick={onNext}
                    className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-lg transition-all shadow-xl shadow-indigo-900/50 flex items-center justify-center gap-3"
                  >
                    <span>Proceed to Inspection</span>
                    <BookOpen className="w-6 h-6" />
                  </button>

                  <p className="text-white/30 text-center text-xs italic font-medium leading-relaxed px-4">
                     "By proceeding, you verify that you are physically present at the above institution."
                  </p>
               </motion.div>
             ) : (
               <motion.div
                 key="placeholder"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 className="bg-slate-50 border-4 border-dashed border-slate-200 p-20 rounded-[3rem] text-center space-y-4"
               >
                  <Building className="w-16 h-16 text-slate-200 mx-auto" />
                  <p className="text-slate-400 font-bold">Select a school from the list to view its summary and begin.</p>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      </div>

      <div className="flex justify-start">
         <button
           onClick={onBack}
           className="px-8 py-4 text-slate-500 font-bold hover:text-indigo-600 transition-colors flex items-center gap-2"
         >
           <CheckCircle2 className="w-5 h-5 rotate-180" />
           <span>Back to Type Selection</span>
         </button>
      </div>
    </div>
  );
};
