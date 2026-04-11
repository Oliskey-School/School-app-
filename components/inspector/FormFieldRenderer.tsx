import React from 'react';
import { InspectionField } from '../../types/inspector';
import { PhotoCaptureField } from './PhotoCaptureField';
import { 
  Check, X, ChevronDown, 
  AlertTriangle, Clock 
} from 'lucide-react';

interface Props {
  field: InspectionField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

export const FormFieldRenderer: React.FC<Props> = ({ 
  field, 
  value, 
  onChange, 
  error 
}) => {
  const commonClasses = `
    w-full bg-slate-50 border-2 rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none transition-all
    ${error ? 'border-red-500 focus:ring-red-50' : 'border-slate-100 focus:border-indigo-600 focus:ring-8 focus:ring-indigo-50'}
  `;

  switch (field.type) {
    case 'text':
    case 'textarea':
      return (
        <div className="space-y-4">
           {field.type === 'textarea' ? (
             <textarea 
               value={value || ''}
               onChange={(e) => onChange(e.target.value)}
               className={`${commonClasses} min-h-[120px]`}
               placeholder="Enter detailed notes..."
             />
           ) : (
             <input 
               type="text"
               value={value || ''}
               onChange={(e) => onChange(e.target.value)}
               className={commonClasses}
               placeholder="Type here..."
             />
           )}
        </div>
      );

    case 'number':
      return (
        <input 
          type="number"
          min={field.min}
          max={field.max}
          value={value || ''}
          onChange={(e) => onChange(Number(e.target.value))}
          className={commonClasses}
          placeholder={`Range: ${field.min || 0} - ${field.max || '∞'}`}
        />
      );

    case 'boolean':
      return (
        <div className="flex gap-4">
           {[
             { label: 'Yes', value: true, icon: Check, color: 'emerald' },
             { label: 'No', value: false, icon: X, color: 'red' }
           ].map((opt) => (
             <button
               key={opt.label}
               type="button"
               onClick={() => onChange(opt.value)}
               className={`
                 flex-1 py-4 px-6 rounded-2xl font-black flex items-center justify-center gap-3 border-4 transition-all
                 ${value === opt.value 
                   ? opt.color === 'emerald' ? 'bg-emerald-500 text-white border-emerald-600 shadow-xl shadow-emerald-100' : 'bg-red-500 text-white border-red-600 shadow-xl shadow-red-100' 
                   : 'bg-white text-slate-400 border-slate-50 hover:bg-slate-50'}
               `}
             >
               <opt.icon className="w-5 h-5" />
               <span>{opt.label}</span>
             </button>
           ))}
        </div>
      );

    case 'dropdown':
      return (
        <div className="relative">
           <select 
             value={value || ''}
             onChange={(e) => onChange(e.target.value)}
             className={`${commonClasses} appearance-none cursor-pointer`}
           >
             <option value="" disabled>Select an option</option>
             {field.options?.map((opt) => (
               <option key={opt} value={opt}>{opt}</option>
             ))}
           </select>
           <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      );

    case 'photo_capture':
      return (
        <PhotoCaptureField 
          fieldId={field.id}
          photos={value || []}
          onChange={onChange}
        />
      );

    case 'score_slider':
      return (
        <div className="space-y-6">
           <div className="flex justify-between items-end">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Slider Adjustment</span>
              <span className="text-3xl font-black text-indigo-600">{(value || 0).toFixed(1)} <span className="text-sm text-slate-300">/ {field.max || 10}</span></span>
           </div>
           <input 
             type="range"
             min={field.min || 0}
             max={field.max || 10}
             step={0.5}
             value={value || 0}
             onChange={(e) => onChange(Number(e.target.value))}
             className="w-full h-3 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600"
           />
           <div className="flex justify-between text-[10px] font-black text-slate-300 uppercase">
              <span>Poor (0)</span>
              <span>Average (5)</span>
              <span>Excellent ({field.max || 10})</span>
           </div>
        </div>
      );

    case 'date':
      return (
        <input 
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={commonClasses}
        />
      );

    default:
      return (
        <div className="p-6 bg-amber-50 text-amber-600 rounded-2xl flex items-center gap-3 font-bold border border-amber-100">
           <AlertTriangle className="w-5 h-5" />
           <span>Field type "{field.type}" implementation pending...</span>
        </div>
      );
  }
};
