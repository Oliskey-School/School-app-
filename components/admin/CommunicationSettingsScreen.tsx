import React, { useState, useEffect } from 'react';
import { ChevronRightIcon } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
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

const CommunicationSettingsScreen: React.FC = () => {
  const { currentSchool } = useAuth();
  const [channels, setChannels] = useState({ email: true, sms: false, app: true });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if ((currentSchool as any)?.settings?.communicationChannels) {
      setChannels((currentSchool as any).settings.communicationChannels);
    }
  }, [currentSchool]);

  const handleSave = async () => {
    if (!currentSchool?.id) return;
    setIsLoading(true);
    try {
      const { error } = await api
        .from('schools')
        .update({
          settings: {
            ...((currentSchool as any).settings || {}),
            communicationChannels: channels
          }
        })
        .eq('id', currentSchool.id);

      if (error) throw error;
      toast.success('Communication settings saved');
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4 bg-gray-50">
      <Accordion title="Notification Channels" defaultOpen>
        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex items-center justify-between"><label>Enable Email Notifications</label><input type="checkbox" checked={channels.email} onChange={e => setChannels(c => ({ ...c, email: e.target.checked }))} className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500" /></div>
          <div className="flex items-center justify-between"><label>Enable SMS Notifications</label><input type="checkbox" checked={channels.sms} onChange={e => setChannels(c => ({ ...c, sms: e.target.checked }))} className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500" /></div>
          <div className="flex items-center justify-between"><label>Enable In-App Notifications</label><input type="checkbox" checked={channels.app} onChange={e => setChannels(c => ({ ...c, app: e.target.checked }))} className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500" /></div>
        </div>
      </Accordion>
      <Accordion title="Parent Portal Settings">
        <p className="text-gray-600 text-sm">Control what parents can see and do in their portal (e.g., view grades, chat with teachers).</p>
      </Accordion>
      <button
        onClick={handleSave}
        disabled={isLoading}
        className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-indigo-700 transition disabled:opacity-50"
      >
        {isLoading ? 'Saving...' : 'Save Communication Settings'}
      </button>
    </div>
  );
};
export default CommunicationSettingsScreen;

