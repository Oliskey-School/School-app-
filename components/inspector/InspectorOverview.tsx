import React from 'react';
import { 
  ClipboardCheck, Clock, CheckCircle, Search, 
  ChevronRight, Calendar, MapPin, Star,
  ArrowUpRight, School as SchoolIcon, Filter, 
  PlusCircle, RefreshCw, FileText, AlertTriangle, Building
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { InspectorProfile, Inspection, InspectorStats } from '../../types/inspector';

interface Props {
  inspector: InspectorProfile;
  stats: InspectorStats | null;
  recentInspections: Inspection[];
  upcomingInspections: Inspection[];
  onStartNew: () => void;
  onSearchSchools: () => void;
  onInspectionClick: (id: string) => void;
  onRefresh?: () => void;
  isRevalidating?: boolean;
}

const RiskBadge = ({ level }: { level?: string }) => {
  const colors = {
    High: 'bg-red-50 text-red-600 border-red-100',
    Medium: 'bg-orange-50 text-orange-600 border-orange-100',
    Low: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  };
  const color = colors[level as keyof typeof colors] || colors.Low;
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border animate-pulse ${color}`}>
      {level || 'Low'} Risk
    </span>
  );
};

export const InspectorOverview: React.FC<Props> = ({
  inspector,
  stats,
  recentInspections,
  upcomingInspections,
  onStartNew,
  onSearchSchools,
  onInspectionClick,
  onRefresh,
  isRevalidating
}) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <motion.div variants={itemVariants} className="flex items-center gap-2 text-indigo-600 font-bold mb-2">
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
               <Star className="w-4 h-4 fill-indigo-600" />
            </div>
            <span className="uppercase tracking-widest text-xs">Inspector Management Portal</span>
          </motion.div>
          <motion.h1 variants={itemVariants} className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-3">
            Welcome back, <span className="text-indigo-600">{inspector.full_name.split(' ')[0]}</span>
          </motion.h1>
          <motion.p variants={itemVariants} className="text-slate-500 font-medium text-lg flex items-center gap-2">
            <span className="text-slate-900 font-bold">{inspector.ministry_department}</span> 
            <span className="text-slate-300">•</span>
            <span>{inspector.region} Zone</span>
          </motion.p>
        </div>
        
        <motion.div variants={itemVariants} className="flex gap-3">
          <button 
            onClick={onSearchSchools}
            className="flex items-center gap-2 px-6 py-3.5 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >
            <Search className="w-5 h-5" />
            <span>Search Schools</span>
          </button>
          <button 
            onClick={onStartNew}
            className="flex items-center gap-2 px-8 py-3.5 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-100 hover:-translate-y-0.5 active:scale-95 btn-primary"
          >
            <PlusCircle className="w-6 h-6" />
            <span>New Inspection</span>
          </button>
        </motion.div>
      </div>

      {/* KPI Cards — Modules 1 Spec */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            label: 'Total Inspections', 
            value: stats?.totalInspections || 0, 
            icon: FileText, 
            color: 'bg-blue-50 text-blue-600', 
            border: 'border-blue-100 shadow-blue-50/50'
          },
          { 
            label: 'Completed', 
            value: stats?.completedInspections || 0, 
            icon: CheckCircle, 
            color: 'bg-emerald-50 text-emerald-600', 
            border: 'border-emerald-100 shadow-emerald-50/50'
          },
          { 
            label: 'Upcoming', 
            value: stats?.scheduledInspections || 0, 
            icon: Clock, 
            color: 'bg-orange-50 text-orange-600', 
            border: 'border-orange-100 shadow-orange-50/50',
            badge: `${stats?.scheduledInspections || 0} Next 7 Days`
          },
          { 
            label: 'Schools Inspected', 
            value: stats?.schoolsInspected || 0,
            icon: Building, 
            color: 'bg-purple-50 text-purple-600', 
            border: 'border-purple-100 shadow-purple-50/50'
          },
        ].map((stat, i) => (
          <motion.div 
            key={stat.label}
            variants={itemVariants}
            className={`bg-white p-6 rounded-[2rem] border-2 ${stat.border} shadow-xl transition-all relative group overflow-hidden`}
          >
            <div className={`w-14 h-14 ${stat.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500`}>
              <stat.icon className="w-7 h-7" />
            </div>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">{stat.label}</p>
            <div className="flex items-center justify-between">
              <h4 className="text-3xl font-black text-slate-900">{stat.value}</h4>
              {stat.badge && (
                <span className="px-3 py-1 bg-white border border-slate-100 text-[10px] font-black uppercase text-slate-500 rounded-full shadow-sm">
                  {stat.badge}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
        {/* Upcoming Inspections Panel */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              Upcoming Inspections
            </h3>
            <span className="text-slate-400 font-bold text-sm tracking-widest uppercase">Next 5 Sessions</span>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {upcomingInspections.length > 0 ? (
              upcomingInspections.slice(0, 5).map((session) => (
                <motion.div
                  key={session.id}
                  whileHover={{ scale: 1.01, x: 5 }}
                  className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all flex flex-col md:flex-row items-center gap-6 group"
                >
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-50 transition-colors flex-shrink-0">
                    <Building className="w-8 h-8 text-slate-300 group-hover:text-indigo-600" />
                  </div>
                  
                  <div className="flex-1 text-center md:text-left">
                    <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 mb-1">
                      <h4 className="text-xl font-black text-slate-900">{session.school?.name || 'Academic Institution'}</h4>
                      <RiskBadge level={session.risk_level} />
                    </div>
                    <p className="text-slate-500 font-medium text-sm flex items-center justify-center md:justify-start gap-3">
                      <span className="flex items-center gap-1.5"><SchoolIcon className="w-3.5 h-3.5" /> Private School</span>
                      <span className="text-slate-200">|</span>
                      <span className="flex items-center gap-1.5"><ClipboardCheck className="w-3.5 h-3.5" /> Routine Audit</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Scheduled For</p>
                      <p className="text-slate-900 font-black">{new Date(session.started_at || session.created_at).toLocaleDateString()}</p>
                    </div>
                    <button 
                      onClick={() => onInspectionClick(session.id)}
                      className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-indigo-600 transition-all flex items-center gap-2 group-hover:shadow-lg"
                    >
                      <span>Start Now</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-20 text-center">
                 <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <Calendar className="w-10 h-10 text-slate-200" />
                 </div>
                 <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">No Sessions Scheduled</h3>
                 <button onClick={onStartNew} className="mt-4 text-indigo-600 font-black hover:underline">Register a new session</button>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-indigo-600" />
              </div>
              Activity
            </h3>
            <span className="text-slate-400 font-bold text-[10px] tracking-widest uppercase">Last 10</span>
          </div>

          <div className="bg-slate-900 rounded-[3rem] p-8 shadow-2xl relative overflow-hidden min-h-[500px]">
            {/* Visual Flare */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -ml-16 -mb-16"></div>

            <div className="space-y-6 relative z-10">
              {recentInspections.length > 0 ? (
                recentInspections.slice(0, 10).map((act) => (
                  <div key={act.id} className="flex gap-4 group">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 bg-indigo-500 rounded-full border-4 border-slate-900 group-hover:scale-150 transition-transform"></div>
                      <div className="flex-1 w-0.5 bg-slate-800 my-1 group-last:hidden"></div>
                    </div>
                    <div className="pb-6">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">
                        {new Date(act.completed_at || act.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <h4 className="text-white font-bold max-w-[200px] truncate group-hover:text-indigo-400 transition-colors">
                        {act.school?.name || 'School Inspected'}
                      </h4>
                      <div className="inline-flex items-center gap-2 mt-2 px-2 py-1 bg-white/5 rounded-lg border border-white/5">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-white font-black text-[10px]">{act.overall_rating?.split(' - ')[0] || 'Pass'}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20">
                   <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">No recent audit activity found</p>
                </div>
              )}
            </div>
            
            <button className="w-full mt-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all">
               Load Full History
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
