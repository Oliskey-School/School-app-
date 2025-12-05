

import React from 'react';
import { 
    LoginIcon,
    LogoutIcon,
    PlusIcon,
    EditIcon,
    TrashIcon,
    PublishIcon,
    DollarSignIcon,
} from '../../constants';
import { mockAuditLogs } from '../../data';
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
  return (
    <div className="flex flex-col h-full bg-gray-100">
      <main className="flex-grow p-4 overflow-y-auto">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-7 top-0 h-full w-0.5 bg-gray-200"></div>

          <ul className="space-y-6">
            {mockAuditLogs.map((log) => (
              <li key={log.id} className="relative flex items-start space-x-4">
                {/* Icon Circle */}
                <div className="z-10 flex-shrink-0 w-14 h-14 bg-white rounded-full flex items-center justify-center border-4 border-gray-100 shadow-sm">
                  {actionIcons[log.type]}
                </div>
                
                {/* Log Details */}
                <div className="flex-grow pt-1">
                    <div className="flex items-center space-x-2">
                        <img src={log.user.avatarUrl} alt={log.user.name} className="w-6 h-6 rounded-full"/>
                        <p className="font-semibold text-gray-800">{log.user.name}</p>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{log.action}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDistanceToNow(log.timestamp)}</p>
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
