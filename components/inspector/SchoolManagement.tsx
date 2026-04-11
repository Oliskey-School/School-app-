import React, { useState } from 'react';
import { 
  Search, School as SchoolIcon, MapPin, 
  ChevronRight, Filter, Star, Phone, Mail,
  ArrowRight, CheckCircle2, History
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { School } from '../../types';
import { useSearchSchools, useSchoolsInJurisdiction } from '../../hooks/useSchools';

interface Props {
  jurisdictionIds: string[];
  onSelectSchool: (school: School) => void;
  onBack: () => void;
}

export const SchoolManagement: React.FC<Props> = ({ 
  jurisdictionIds, 
  onSelectSchool,
  onBack 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'jurisdiction'>('jurisdiction');
  
  const { data: jurisdictionSchools, isLoading: isLoadingJurisdiction } = useSchoolsInJurisdiction(jurisdictionIds);
  const { data: searchResults, isLoading: isSearching } = useSearchSchools(searchTerm);

  const schools = searchTerm.length >= 2 ? (searchResults || []) : (jurisdictionSchools || []);
  const isLoading = searchTerm.length >= 2 ? isSearching : isLoadingJurisdiction;

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Select School</h2>
            <p className="text-slate-500 font-medium">Search for a school to begin inspection</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setFilterType('jurisdiction')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filterType === 'jurisdiction' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600'}`}
            >
              My Jurisdiction
            </button>
            <button 
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filterType === 'all' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600'}`}
            >
              All Schools
            </button>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className={`w-5 h-5 transition-colors ${searchTerm ? 'text-indigo-600' : 'text-slate-400'}`} />
          </div>
          <input
            type="text"
            placeholder="Search by school name, state or LGA..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all outline-none text-slate-900 font-medium"
          />
          {isLoading && (
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
              <div className="w-5 h-5 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>

      {/* School List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {schools.map((school, index) => (
            <motion.div
              key={school.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSelectSchool(school)}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                  {school.logoUrl ? (
                    <img src={school.logoUrl} alt={school.name} className="w-12 h-12 object-contain" />
                  ) : (
                    <SchoolIcon className="w-8 h-8 text-slate-400 group-hover:text-indigo-600" />
                  )}
                </div>
                <div className="flex gap-2">
                   {jurisdictionIds.includes(school.id) && (
                     <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase rounded-lg border border-emerald-100">
                       Jurisdiction
                     </span>
                   )}
                </div>
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                {school.name}
              </h3>
              
              <div className="space-y-2 mb-6">
                <p className="text-slate-500 text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {school.address || 'Address N/A'}
                </p>
                <div className="flex gap-4">
                   <p className="text-slate-400 text-xs flex items-center gap-1">
                     <History className="w-3.5 h-3.5" />
                     Last Inspected: 2 months ago
                   </p>
                   <p className="text-slate-400 text-xs flex items-center gap-1">
                     <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                     4.5 Rating
                   </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <span className="text-indigo-600 font-bold text-sm">Select for Inspection</span>
                <div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                  <ChevronRight className="w-5 h-5 text-indigo-600 group-hover:text-white transition-colors" />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {schools.length === 0 && !isLoading && (
          <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <SchoolIcon className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-800">No schools found</h3>
            <p className="text-slate-500 max-w-xs mx-auto mt-2">
              Try adjusting your search terms or verify the school is within your jurisdiction.
            </p>
            <button 
              onClick={() => { setSearchTerm(''); setFilterType('all'); }}
              className="mt-6 text-indigo-600 font-bold hover:underline"
            >
              Show all schools
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
