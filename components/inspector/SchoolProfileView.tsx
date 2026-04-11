import React from 'react';
import { 
  Building, User, MapPin, Phone, Mail, 
  Calendar, CheckCircle, Clock, AlertCircle, 
  FileText, Plus, ChevronLeft, Star, 
  GraduationCap, Users, Shield, Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { SchoolProfile } from '../../types/inspector';
import { useSchoolProfile } from '../../hooks/useSchools';

interface Props {
  schoolId: string;
  onBack: () => void;
  onStartInspection: () => void;
  onViewReport: (id: string) => void;
}

export const SchoolProfileView: React.FC<Props> = ({ 
  schoolId, 
  onBack, 
  onStartInspection, 
  onViewReport 
}) => {
  const { data: profile, isLoading } = useSchoolProfile(schoolId);

  if (isLoading) return <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest">Loading School Profile...</div>;
  if (!profile) return <div className="p-20 text-center">School not found</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Navigation & Actions */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 font-bold hover:text-indigo-600 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Back to Directory</span>
        </button>
        <button 
          onClick={onStartInspection}
          className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-500 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span>Conduct New Inspection</span>
        </button>
      </div>

      {/* Profile Header */}
      <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
           <Building className="w-64 h-64 text-slate-900" />
        </div>
        
        <div className="flex flex-col md:flex-row gap-10 relative z-10">
          <div className="w-32 h-32 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center text-indigo-600 shadow-inner">
             <Building className="w-16 h-16" />
          </div>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">{profile.name}</h1>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-xs font-black uppercase tracking-widest">
                Fully Approved
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-slate-500">
               <div className="flex items-center gap-3">
                 <User className="w-5 h-5 text-indigo-400" />
                 <span className="font-bold">Proprietor:</span>
                 <span className="text-slate-900">{profile.proprietor_name || 'Dr. Oliskey Admin'}</span>
               </div>
               <div className="flex items-center gap-3">
                 <MapPin className="w-5 h-5 text-indigo-400" />
                 <span className="font-bold">LGA:</span>
                 <span className="text-slate-900">{profile.lga || 'Ikeja'}</span>
               </div>
               <div className="flex items-center gap-3">
                 <FileText className="w-5 h-5 text-indigo-400" />
                 <span className="font-bold">Reg No:</span>
                 <span className="text-slate-900">{profile.registration_number || 'Lagos-Edu-2026-X'}</span>
               </div>
               <div className="flex items-center gap-3 font-medium">
                 <Mail className="w-4 h-4 text-slate-300" />
                 {profile.contact_email || 'contact@school.com'}
               </div>
               <div className="flex items-center gap-3 font-medium">
                 <Phone className="w-4 h-4 text-slate-300" />
                 {profile.contact_phone || '+234 800 000 0000'}
               </div>
               <div className="flex items-center gap-3 font-medium">
                 <GraduationCap className="w-4 h-4 text-slate-300" />
                 {profile.curriculum_type || 'Nigerian/British'}
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Current Enrolment', value: profile.enrolment_total || '1,240', icon: Users, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'WSE Score (Recent)', value: `${profile.last_wse_score || 85}%`, icon: Star, color: 'text-amber-600 bg-amber-50' },
          { label: 'GAPS Grade', value: `Grade ${profile.gaps_grade || 'A'}`, icon: Shield, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Risk Level', value: `${profile.risk_level || 'Low'} Risk`, icon: AlertCircle, color: profile.risk_level === 'High' ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`w-14 h-14 ${stat.color} rounded-2xl flex items-center justify-center flex-shrink-0`}>
              <stat.icon className="w-7 h-7" />
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none mb-1">{stat.label}</p>
              <h4 className="text-2xl font-black text-slate-900">{stat.value}</h4>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Timeline & SIP */}
        <div className="lg:col-span-8 space-y-8">
          {/* Historical Timeline */}
          <section className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
              <Calendar className="w-7 h-7 text-indigo-600" />
              Inspection History
            </h3>
            <div className="space-y-8 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-50">
              {profile.inspection_history?.map((ins, idx) => (
                <div key={ins.id} className="relative pl-12 group">
                  <div className="absolute left-[13px] top-1.5 w-2 h-2 rounded-full bg-indigo-600 z-10 group-hover:scale-150 transition-transform shadow-lg shadow-indigo-200"></div>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-50/50 rounded-3xl border border-slate-100 group-hover:bg-white group-hover:shadow-xl transition-all">
                    <div>
                      <p className="text-indigo-600 font-bold text-xs uppercase tracking-widest mb-1">{new Date(ins.completed_at || ins.created_at).toLocaleDateString()}</p>
                      <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">{ins.inspection_type || 'Routine Inspection'}</h4>
                      <div className="flex items-center gap-2 mt-2 text-slate-500 font-medium text-xs">
                        <User className="w-3.5 h-3.5" />
                        <span>Inspector: Mr. Folabi Adams</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Result</span>
                        <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg font-black text-xs">
                           GRADE {ins.overall_rating?.split(' - ')[0] || 'A'}
                        </div>
                      </div>
                      <button 
                        onClick={() => onViewReport(ins.id)}
                        className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 hover:shadow-md transition-all"
                      >
                         <FileText className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Outstanding SIP items */}
          <section className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
             <div className="flex items-center justify-between mb-8">
               <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                 <Zap className="w-7 h-7 text-amber-500" />
                 Corrective Actions (SIP)
               </h3>
               <span className="px-3 py-1 bg-amber-50 text-amber-600 font-black text-[10px] rounded-lg tracking-widest uppercase">3 Pending Items</span>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.sip_items?.map((sip) => (
                  <div key={sip.id} className="p-6 bg-slate-50 border border-slate-100 rounded-3xl space-y-4">
                    <div className="flex items-center justify-between">
                       <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${sip.priority === 'High' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'}`}>
                         {sip.priority} Priority
                       </span>
                       <span className="text-slate-400 font-black text-[10px] uppercase">{new Date(sip.deadline).toLocaleDateString()}</span>
                    </div>
                    <h4 className="font-bold text-slate-900 leading-tight">{sip.issue}</h4>
                    <p className="text-xs text-slate-500 italic">" {sip.recommendation.slice(0, 100)}... "</p>
                  </div>
                ))}
             </div>
          </section>
        </div>

        {/* Right Column: Teacher roll & Facilities */}
        <div className="lg:col-span-4 space-y-8">
          {/* Teacher Nominal Roll */}
          <section className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl text-white">
            <h3 className="text-xl font-black mb-6 flex items-center gap-3">
              <Users className="w-5 h-5 text-indigo-400" />
              Teacher Nominal Roll
            </h3>
            <div className="space-y-6">
               <div className="p-6 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                  <div>
                    <p className="text-white/50 text-[10px] font-black uppercase tracking-widest mb-1">Total Roll</p>
                    <h4 className="text-3xl font-black">{profile.teacher_summary?.total || 42}</h4>
                  </div>
                  <User className="w-10 h-10 text-white/10" />
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                 <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                   <p className="text-emerald-400 text-[9px] font-black uppercase tracking-widest mb-1">Qualified</p>
                   <p className="text-xl font-black">{profile.teacher_summary?.qualified || 38}</p>
                 </div>
                 <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                   <p className="text-red-400 text-[9px] font-black uppercase tracking-widest mb-1">Unqualified</p>
                   <p className="text-xl font-black text-red-400">{profile.teacher_summary?.unqualified || 4}</p>
                 </div>
               </div>
               
               {profile.teacher_summary?.flagged_count > 0 && (
                 <div className="p-4 bg-red-400/10 border border-red-400/20 rounded-2xl flex items-center gap-3 text-red-400">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-xs font-bold leading-snug">
                      Alert: {profile.teacher_summary.flagged_count} teachers have expired or missing TRCN certificates.
                    </p>
                 </div>
               )}
            </div>
          </section>

          {/* Facility Status Summary */}
          <section className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
             <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
               <Zap className="w-5 h-5 text-indigo-600" />
               Facility Status
             </h3>
             <div className="grid grid-cols-1 gap-4">
                {profile.facility_summary?.map((fac) => (
                  <div key={fac.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                     <div className="flex items-center gap-3">
                       <CheckCircle className={`w-4 h-4 ${fac.status === 'Operational' ? 'text-emerald-500' : 'text-slate-300'}`} />
                       <span className="text-xs font-bold text-slate-900">{fac.name}</span>
                     </div>
                     <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${fac.status === 'Operational' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {fac.status}
                     </span>
                  </div>
                ))}
             </div>
          </section>

          {/* Quick Contact Card */}
          <div className="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-xl shadow-indigo-100">
              <h4 className="font-black text-lg mb-4">Contact Person</h4>
              <div className="flex items-center gap-4 mb-6">
                 <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6" />
                 </div>
                 <div>
                    <p className="font-bold">Mrs. Adebeye Shola</p>
                    <p className="text-white/60 text-xs">Official Registrar</p>
                 </div>
              </div>
              <button className="w-full py-3 bg-white text-indigo-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">
                 Message Institution
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};
