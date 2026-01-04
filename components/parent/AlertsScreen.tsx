
import React from 'react';
import { mockNotifications } from '../../data';
import { mockStudents, mockFees } from '../../data';
import { NOTIFICATION_CATEGORY_CONFIG } from '../../constants';
import { Notification } from '../../types';

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
  if (days === 1) return 'Yesterday';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

interface AlertsScreenProps {
  navigateTo: (view: string, title: string, props?: any) => void;
}

const AlertsScreen: React.FC<AlertsScreenProps> = ({ navigateTo }) => {

  const handleNotificationClick = (notification: Notification) => {
    switch (notification.category) {
      case 'Fees':
        const feeStudentInfo = mockFees.find(f => f.id === notification.studentId);
        if (feeStudentInfo) {
          navigateTo('feeStatus', 'Fee Status', { student: feeStudentInfo });
        }
        break;
      case 'Attendance':
        const student = mockStudents.find(s => s.id === notification.studentId);
        if (student) {
          navigateTo('childDetail', student.name, { student, initialTab: 'attendance' });
        }
        break;
      case 'Event':
        navigateTo('calendar', 'School Calendar', {});
        break;
      case 'Message':
        // This functionality is not fully built out, so just an alert for now.
        toast("Navigating to messages...", { icon: '✉️' });
        break;
      default:
        break;
    }
  };

  const sortedNotifications = [...mockNotifications].filter(n => n.audience.includes('parent')).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="flex flex-col h-full bg-gray-100">
      <main className="flex-grow p-4 space-y-3 overflow-y-auto">
        {sortedNotifications.length > 0 ? (
          sortedNotifications.map(notification => {
            const config = NOTIFICATION_CATEGORY_CONFIG[notification.category];
            const Icon = config.icon;
            return (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className="w-full text-left bg-white rounded-xl shadow-sm p-4 flex items-start space-x-4 relative transition-all hover:shadow-md hover:ring-2 hover:ring-green-200"
              >
                {!notification.isRead && (
                  <div className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse"></div>
                )}
                <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${config.bg}`}>
                  <Icon className={`w-6 h-6 ${config.color}`} />
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-center">
                    <p className={`font-bold ${notification.isRead ? 'text-gray-700' : 'text-gray-900'}`}>{notification.title}</p>
                    <p className="text-xs text-gray-500 flex-shrink-0 ml-2">
                      {formatDistanceToNow(notification.timestamp)}
                    </p>
                  </div>
                  <p className={`text-sm mt-1 ${notification.isRead ? 'text-gray-600' : 'text-gray-800'}`}>{notification.summary}</p>
                </div>
              </button>
            )
          })
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-500">No new notifications.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default AlertsScreen;
