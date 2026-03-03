import React, { useState, useEffect } from 'react';
import { ChevronRightIcon } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

const Accordion: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4 text-left font-bold text-gray-800">
        <span>{title}</span>
        <ChevronRightIcon className={`transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      {isOpen && <div className="p-4 border-t">{children}</div>}
    </div>
  );
};

const FinancialSettingsScreen: React.FC = () => {
  const { currentSchool } = useAuth();
  const [currency, setCurrency] = useState('NGN');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentSchool?.settings?.financial) {
      setCurrency(currentSchool.settings.financial.currency || 'NGN');
    }
  }, [currentSchool]);

  const handleSave = async () => {
    if (!currentSchool?.id) return;
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('schools')
        .update({
          settings: {
            ...(currentSchool.settings || {}),
            financial: { currency }
          }
        })
        .eq('id', currentSchool.id);

      if (error) throw error;
      toast.success('Financial settings saved');
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4 bg-gray-50">
      <Accordion title="Tuition & Fee Structure" defaultOpen>
        <div className="flex items-center justify-between p-2">
          <label className="text-sm font-medium">Default Currency</label>
          <select value={currency} onChange={e => setCurrency(e.target.value)} className="border rounded-md p-1">
            <option value="NGN">NGN (₦)</option>
            <option value="USD">USD ($)</option>
            <option value="GBP">GBP (£)</option>
          </select>
        </div>
      </Accordion>
      <Accordion title="Invoice & Payment Methods">
        <p className="text-gray-600 text-sm">Customize invoice templates and enable payment methods like Bank Transfer, Card, etc.</p>
      </Accordion>
      <button
        onClick={handleSave}
        disabled={isLoading}
        className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-indigo-700 transition disabled:opacity-50"
      >
        {isLoading ? 'Saving...' : 'Save Financial Settings'}
      </button>
    </div>
  );
};
export default FinancialSettingsScreen;
