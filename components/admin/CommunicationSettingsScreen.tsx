import React, { useState } from 'react';
import { ChevronRightIcon } from '../../constants';

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
    const [channels, setChannels] = useState({ email: true, sms: false, app: true });
    return (
        <div className="p-4 space-y-4 bg-gray-50">
            <Accordion title="Notification Channels" defaultOpen>
                <div className="space-y-3 text-sm text-gray-700">
                    <div className="flex items-center justify-between"><label>Enable Email Notifications</label><input type="checkbox" checked={channels.email} onChange={e => setChannels(c => ({...c, email: e.target.checked}))} className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500" /></div>
                    <div className="flex items-center justify-between"><label>Enable SMS Notifications</label><input type="checkbox" checked={channels.sms} onChange={e => setChannels(c => ({...c, sms: e.target.checked}))} className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500" /></div>
                    <div className="flex items-center justify-between"><label>Enable In-App Notifications</label><input type="checkbox" checked={channels.app} onChange={e => setChannels(c => ({...c, app: e.target.checked}))} className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500" /></div>
                </div>
            </Accordion>
            <Accordion title="Parent Portal Settings">
                <p className="text-gray-600 text-sm">Control what parents can see and do in their portal (e.g., view grades, chat with teachers).</p>
            </Accordion>
        </div>
    );
};
export default CommunicationSettingsScreen;
