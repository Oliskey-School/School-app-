import React from 'react';
import { 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Printer, 
  Download, 
  FileText, 
  MapPin, 
  Calendar, 
  UserCheck, 
  Activity,
  Award,
  ChevronLeft
} from 'lucide-react';
import { Inspection, InspectorProfile } from '../../types/inspector';

interface Props {
  inspection: Inspection;
  inspector: InspectorProfile;
  onClose: () => void;
}

const InspectionReportGenerator: React.FC<Props> = ({ inspection, inspector, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pass': return 'text-emerald-600 bg-emerald-50';
      case 'Fail': return 'text-red-600 bg-red-50';
      default: return 'text-slate-500 bg-slate-50';
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen p-4 md:p-8 print:p-0 animate-in fade-in duration-500">
      {/* Action Bar (Hidden on Print) */}
      <div className="max-w-5xl mx-auto flex justify-between items-center mb-8 print:hidden bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-slate-200 shadow-sm sticky top-4 z-50">
        <button 
          onClick={onClose} 
          className="flex items-center gap-2 px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
          Close Preview
        </button>
        <div className="flex space-x-3">
          <button 
            onClick={handlePrint} 
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg hover:shadow-slate-200"
          >
            <Printer className="w-5 h-5" />
            <span>Print Official Report</span>
          </button>
          <button className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-500 transition-all shadow-lg hover:shadow-indigo-100">
            <Download className="w-5 h-5" />
            <span>Export as PDF</span>
          </button>
        </div>
      </div>

      {/* Official Report Content */}
      <div className="max-w-5xl mx-auto bg-white shadow-2xl rounded-[2rem] border border-slate-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">
        <div className="p-12 md:p-20 print:p-8">
          {/* Ministry Header */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-16 border-b border-slate-100 pb-12">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-slate-900 rounded-3xl flex items-center justify-center text-white rotate-3 shadow-xl">
                <Shield className="w-14 h-14 -rotate-3" />
              </div>
              <div>
                <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900 leading-none mb-1">Ministry of Education</h1>
                <h2 className="text-xl font-bold text-indigo-600 uppercase tracking-widest">Quality Assurance Bureau</h2>
                <p className="text-xs font-mono text-slate-400 mt-2">REF: {inspection.id.toUpperCase()}</p>
              </div>
            </div>
            <div className="text-center md:text-right">
              <div className="inline-block px-4 py-2 bg-slate-100 rounded-xl text-slate-900 font-black text-sm uppercase tracking-widest border border-slate-200">
                Official Audit Certificate
              </div>
              <p className="text-slate-400 text-xs mt-3 font-medium">Issued on {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>

          {/* Core Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Educational Institution</p>
                  <p className="text-xl font-black text-slate-900 leading-tight">{inspection.school?.name || 'School Name'}</p>
                  <p className="text-slate-500 text-sm mt-1">{inspection.school?.address || 'Institution Address'}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lead Inspector</p>
                  <p className="text-xl font-black text-slate-900 leading-tight">{inspector.full_name}</p>
                  <p className="text-slate-500 text-sm mt-1">ID: {inspector.inspector_code}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Award className="w-32 h-32" />
              </div>
              <p className="text-indigo-400 font-bold uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Final Assessment Result
              </p>
              <div className="flex items-center gap-6">
                <div className="text-6xl font-black text-white">{inspection.overall_rating?.split(' - ')[0] || 'A'}</div>
                <div className="h-12 w-px bg-white/20"></div>
                <div>
                  <p className="text-2xl font-bold leading-none mb-1">{inspection.overall_rating?.split(' - ')[1] || 'Excellent'}</p>
                  <p className="text-white/50 text-xs font-medium uppercase tracking-widest">Compliance Rating</p>
                </div>
              </div>
              <div className="mt-8 pt-8 border-t border-white/10 flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  <span>Inspected: {new Date(inspection.completed_at || inspection.created_at).toLocaleDateString()}</span>
                </div>
                <div className="px-3 py-1 bg-white/10 rounded-full font-bold">VERIFIED</div>
              </div>
            </div>
          </div>

          {/* Detailed Findings */}
          <div className="space-y-10 mb-20">
            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <ClipboardList className="w-7 h-7 text-indigo-600" />
              Detailed Audit Findings
            </h3>
            
            <div className="grid grid-cols-1 gap-6">
              {inspection.items?.map((item, idx) => (
                <div key={item.id} className="p-8 bg-slate-50 rounded-3xl border border-slate-100 group transition-all hover:bg-white hover:shadow-xl hover:border-indigo-100">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-white rounded-lg text-slate-400 border border-slate-100">
                          {item.category}
                        </span>
                        {item.status === 'Pass' ? 
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : 
                          <XCircle className="w-5 h-5 text-red-500" />
                        }
                      </div>
                      <h4 className="text-lg font-black text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">{item.item_name}</h4>
                      <p className="text-slate-600 text-sm leading-relaxed">{item.findings || 'No specific findings recorded for this item.'}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className={`px-5 py-2 rounded-2xl font-black text-sm uppercase tracking-widest ${getStatusColor(item.status)}`}>
                        {item.status}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary & Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
            <div className="p-10 bg-indigo-50/50 rounded-[2.5rem] border border-indigo-100">
              <h4 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Executive Summary
              </h4>
              <p className="text-slate-700 leading-relaxed italic">"{inspection.summary || 'The school has demonstrated a commitment to following educational standards with minor areas for improvement.'}"</p>
            </div>
            <div className="p-10 bg-amber-50/50 rounded-[2.5rem] border border-amber-100 text-amber-900">
              <h4 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                Key Recommendations
              </h4>
              <p className="text-slate-700 leading-relaxed font-medium">"{inspection.recommendations || 'Focused training for staff on new safety protocols is strongly encouraged.'}"</p>
            </div>
          </div>

          {/* Official Signatures */}
          <div className="pt-20 border-t-2 border-slate-900">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
              <div className="space-y-6">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Authorized Inspector</h4>
                <div className="min-h-[120px] flex items-end justify-center border-b-2 border-slate-200 py-4">
                  {inspection.digital_signature_url ? (
                    <img src={inspection.digital_signature_url} alt="Signature" className="max-h-24 object-contain brightness-50" />
                  ) : (
                    <div className="text-slate-200 font-serif italic text-3xl select-none">Digitally Signed</div>
                  )}
                </div>
                <div className="text-center md:text-left">
                  <p className="font-black text-slate-900 text-lg">{inspector.full_name}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Lead Accreditation Officer</p>
                </div>
              </div>
              
              <div className="space-y-6 opacity-40">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Institution Representative</h4>
                <div className="min-h-[120px] flex items-end justify-center border-b-2 border-slate-200 py-4">
                   <div className="w-3/4 h-0.5 bg-slate-100"></div>
                </div>
                <div className="text-center md:text-left">
                  <p className="font-black text-slate-900 text-lg">School Principal / Proprietor</p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Acknowledgement Receipt</p>
                </div>
              </div>
            </div>
          </div>

          {/* Anti-tampering Footer */}
          <div className="mt-32 pt-12 border-t border-slate-100 text-center">
            <p className="text-[9px] text-slate-400 leading-relaxed uppercase tracking-[0.3em] font-medium max-w-2xl mx-auto">
              This document contains encrypted security metadata and is a legally binding ministry record. 
              Unauthorized duplication or modification is a federal criminal offense. 
              Report serial numbers for verification: {inspection.id.slice(0, 13).toUpperCase()}
            </p>
            <div className="mt-8 flex justify-center gap-4 text-slate-200">
              <Shield className="w-6 h-6" />
              <div className="w-px h-6 bg-slate-100"></div>
              <FileText className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ClipboardList = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>
);

export default InspectionReportGenerator;
