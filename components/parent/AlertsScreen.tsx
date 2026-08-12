import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { api } from '../../lib/api';
import { fetchStudentById, fetchStudentFeeSummary } from '../../lib/database';
import { NOTIFICATION_CATEGORY_CONFIG } from '../../constants';
import { Notification } from '../../types';
import { useNotifications, NOTIFICATIONS_QUERY_KEY } from '../../hooks/useNotifications';

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
  // Shared cache — the socket handler in SocketContext merges new
  // notifications straight in, so this only fetches once per session
  // (or reuses the fetch another screen already made), never re-polls.
  const { notifications: rawNotifications, isLoading: loading, queryClient } = useNotifications();

  const notifications: Notification[] = useMemo(() => rawNotifications.map((n: any) => ({
    id: n.id,
    title: n.title,
    summary: n.message,
    category: n.category || 'System',
    timestamp: n.created_at,
    isRead: n.is_read || false,
    audience: n.audience || [],
    studentId: n.student_id,
    relatedId: n.related_id
  })), [rawNotifications]);

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      await api.markNotificationsRead([notification.id]);
      queryClient.setQueryData(NOTIFICATIONS_QUERY_KEY, (prev: any[] | undefined) =>
        (prev || []).map(n => n.id === notification.id ? { ...n, is_read: true } : n)
      );
    }

    switch (notification.category) {
      case 'Fees':
        if (notification.studentId) {
          const feeSummary = await fetchStudentFeeSummary(notification.studentId);
          navigateTo('feeStatus', 'Fee Status', { student: { id: notification.studentId, ...feeSummary } });
        }
        break;
      case 'Attendance':
        if (notification.studentId) {
          const student = await fetchStudentById(notification.studentId);
          if (student) {
            navigateTo('childDetail', student.name, { student, initialTab: 'attendance' });
          }
        }
        break;
      case 'Event':
        navigateTo('calendar', 'School Calendar', {});
        break;
      case 'Message':
        toast("Navigating to messages...", { icon: '✉️' });
        break;
      default:
        break;
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading alerts...</div>;

  return (
    <div className="flex flex-col h-full bg-gray-100">
      <main className="flex-grow p-4 space-y-3 overflow-y-auto pb-24">
        {notifications.length > 0 ? (
          notifications.map((notification, i) => {
            const config = NOTIFICATION_CATEGORY_CONFIG[notification.category] || NOTIFICATION_CATEGORY_CONFIG['System'];
            const Icon = config.icon;
            return (
              <motion.button
                key={notification.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i, 10) * 0.05 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => handleNotificationClick(notification)}
                className={`w-full text-left bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-4 flex items-start space-x-4 relative hover:ring-2 hover:ring-green-200 ${notification.isRead ? 'opacity-70' : ''}`}
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
              </motion.button>
            )
          })
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200">
            <p className="text-gray-500">No new notifications.</p>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default AlertsScreen;
