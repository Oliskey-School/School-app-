
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  LoginIcon,
  LogoutIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  PublishIcon,
  DollarSignIcon,
} from '../../constants';
import { AuditLogActionType } from '../../types';

const actionIcons: { [key in AuditLogActionType]: React.ReactNode } = {
  login: <LoginIcon className="h-5 w-5 text-green-500" />,
  logout: <LogoutIcon className="h-5 w-5 text-red-500" />,
  create: <PlusIcon className="h-5 w-5 text-blue-500" />,
  update: <EditIcon className="h-5 w-5 text-yellow-500" />,
  delete: <TrashIcon className="h-5 w-5 text-purple-500" />,
  publish: <PublishIcon className="h-5 w-5 text-sky-500" />,
  payment: <DollarSignIcon className="h-5 w-5 text-indigo-500" />,
};

// Simple relative time formatter
const formatDistanceToNow = (isoDate: string): string => {
  const date = new Date(isoDate);
  const now = new Date();
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const AuditLogScreen: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*, profiles(name, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) setLogs(data);
    setLoading(false);
  };

  const mapActionToType = (action: string): AuditLogActionType => {
    const a = action.toLowerCase();
    if (a.includes('login')) return 'login';
    if (a.includes('logout')) return 'logout';
    if (a.includes('insert')) return 'create';
    if (a.includes('update')) return 'update';
    if (a.includes('delete')) return 'delete';
    if (a.includes('publish')) return 'publish';
    if (a.includes('payment')) return 'payment';
    return 'update';
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading audit trail...</div>;

  return (
    <div className="flex flex-col h-full bg-gray-100">
      <main className="flex-grow p-4 overflow-y-auto">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-7 top-0 h-full w-0.5 bg-gray-200"></div>

          <ul className="space-y-6">
            {logs.length === 0 && <p className="text-center py-12 text-gray-400">No logs found. Audit system active.</p>}
            {logs.map((log) => (
              <li key={log.id} className="relative flex items-start space-x-4">
                {/* Icon Circle */}
                <div className="z-10 flex-shrink-0 w-14 h-14 bg-white rounded-full flex items-center justify-center border-4 border-gray-100 shadow-sm">
                  {actionIcons[mapActionToType(log.action)]}
                </div>

                {/* Log Details */}
                <div className="flex-grow pt-1">
                  <div className="flex items-center space-x-2">
                    <img src={log.profiles?.avatar_url || 'https://via.placeholder.com/32'} alt={log.profiles?.name} className="w-6 h-6 rounded-full border border-gray-200" />
                    <p className="font-semibold text-gray-800">{log.profiles?.name || 'System User'}</p>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-bold text-gray-700">{log.action}:</span> {log.table_name} record {log.record_id}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{formatDistanceToNow(log.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
};

export default AuditLogScreen;
