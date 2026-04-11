import React, { useState } from 'react';
import { 
  Search, Filter, Calendar, MapPin, 
  ChevronRight, Building, ShieldCheck, 
  AlertTriangle, GraduationCap, Clock, MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SchoolFilter, SchoolProfile } from '../../types/inspector';
import { useSchoolsDirectory } from '../../hooks/useSchools';

interface Props {
  jurisdictionIds: string[];
  onSelectSchool: (school: SchoolProfile) => void;
  onBack: () => void;
}

const GRADE_COLORS: Record<string, string> = {
  'A': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  'B': 'bg-blue-50 text-blue-700 border-blue-100',
  'C': 'bg-amber-50 text-amber-700 border-amber-100',
  'D': 'bg-red-50 text-red-700 border-red-100',
  'Ungraded': 'bg-slate-50 text-slate-500 border-slate-100',
};

const RISK_COLORS: Record<string, string> = {
  'High': 'text-red-600 bg-red-50',
  'Medium': 'text-orange-600 bg-orange-50',
  'Low': 'text-emerald-600 bg-emerald-50',
};

export const SchoolDirectory: React.FC<Props> = ({ 
  jurisdictionIds, 
  onSelectSchool, 
  onBack 
}) => {
  const [filters, setFilters] = useState<SchoolFilter>({
    search: '',
    type: [],
    status: [],
    grade: [],
    risk: [],
  });

  const { data: schools, isLoading } = useSchoolsDirectory(jurisdictionIds, filters);

  const toggleFilter = (key: keyof SchoolFilter, value: string) => {
    setFilters(prev => {
      const current = (prev[key] as string[]) || [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [key]: updated };
    });
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Header */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text"
              placeholder="Search schools by name, code or LGA..."
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-2xl font-bold transition-all hover:bg-slate-800">
              <Filter className="w-5 h-5" />
              <span>Apply Filters</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          {/* Type Filters */}
          <div className="flex gap-2 p-1 bg-slate-50 rounded-xl border border-slate-100">
            {['Primary', 'Secondary', 'International'].map(type => (
              <button
                key={type}
                onClick={() => toggleFilter('type', type)}
                className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                  filters.type?.includes(type) 
                    ? 'bg-white text-indigo-600 shadow-sm border border-indigo-100' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Risk Filters */}
          <div className="flex gap-2 p-1 bg-slate-50 rounded-xl border border-slate-100">
            {['High', 'Medium', 'Low'].map(risk => (
              <button
                key={risk}
                onClick={() => toggleFilter('risk', risk)}
                className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                  filters.risk?.includes(risk) 
                    ? risk === 'High' ? 'bg-red-500 text-white shadow-md' :
                      risk === 'Medium' ? 'bg-orange-500 text-white shadow-md' :
                      'bg-emerald-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {risk} Risk
              </button>
            ))}
          </div>

          {/* Grade Filters */}
          <div className="flex gap-2 p-1 bg-slate-50 rounded-xl border border-slate-100">
            {['A', 'B', 'C', 'D'].map(grade => (
              <button
                key={grade}
                onClick={() => toggleFilter('grade', grade)}
                className={`px-4 py-4 w-10 h-10 flex items-center justify-center rounded-lg text-xs font-black transition-all ${
                  filters.grade?.includes(grade) 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {grade}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Schools Directory Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[600px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Institution Name</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">LGA / Zone</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Approval Status</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Last WSE / Grade</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Visit</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Actions</th>
                <th className="px-8 py-6 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                      <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Syncing Directory...</p>
                    </div>
                  </td>
                </tr>
              ) : schools?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                        <Building className="w-10 h-10 text-slate-200" />
                      </div>
                      <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">No schools found in this jurisdiction</p>
                    </div>
                  </td>
                </tr>
              ) : (
                schools?.map((school) => (
                  <motion.tr 
                    key={school.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    whileHover={{ backgroundColor: '#f8fafc' }}
                    onClick={() => onSelectSchool(school)}
                    className="group cursor-pointer transition-colors"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-xs">
                          {school.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{school.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">Code: {school.registration_number?.slice(-6) || 'N/A'}</span>
                            <div className={`w-2 h-2 rounded-full ${RISK_COLORS[school.risk_level || 'Low']}`}></div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-2 text-slate-600 font-bold text-sm">
                        <MapPin className="w-4 h-4 text-slate-300" />
                        {school.lga || 'Oshodi-Isolo'}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-black uppercase text-emerald-600 tracking-widest">Fully Approved</span>
                      </div>
                    </td>
                    <td className="px-6 py-6 font-bold text-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400">{school.last_wse_score || 85}%</span>
                        <div className={`px-3 py-1 rounded-lg text-[10px] font-black border ${GRADE_COLORS[school.gaps_grade || 'A']}`}>
                          GRADE {school.gaps_grade || 'A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                        <Clock className="w-4 h-4 text-slate-300" />
                        {school.updated_at ? new Date(school.updated_at).toLocaleDateString() : 'Never'}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center font-black text-xs border border-amber-100">
                          3
                        </div>
                        <span className="text-xs font-bold text-slate-500">Corrective Actions</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="p-3 bg-white border border-slate-100 text-slate-400 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all shadow-sm">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Placeholder */}
        <div className="px-8 py-6 bg-slate-50/30 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Showing {schools?.length || 0} of {schools?.length || 0} Institutions</p>
          <div className="flex gap-2">
             <button className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold hover:bg-white transition-all disabled:opacity-50" disabled>Previous</button>
             <button className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold hover:bg-white transition-all disabled:opacity-50" disabled>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};
