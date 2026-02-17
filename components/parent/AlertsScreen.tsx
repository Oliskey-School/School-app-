import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../context/ProfileContext';
import { fetchStudentById, fetchStudentFeeSummary } from '../../lib/database';
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
  const { profile } = useProfile();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!profile?.id) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .or(`user_id.eq.${profile.id},audience.cs.{parent},audience.cs.{all}`)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setNotifications((data || []).map((n: any) => ({
          id: n.id,
          title: n.title,
          summary: n.message,
          category: n.category || 'System',
          timestamp: n.created_at,
          isRead: n.is_read || false,
          audience: n.audience || [],
          studentId: n.student_id,
          relatedId: n.related_id
        })));
      } catch (err) {
        console.error("Error fetching alerts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    const channel = supabase.channel('parent-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.id]);

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
        await supabase.from('notifications').update({ is_read: true }).eq('id', notification.id);
        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n));
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
          notifications.map(notification => {
            const config = NOTIFICATION_CATEGORY_CONFIG[notification.category] || NOTIFICATION_CATEGORY_CONFIG['System'];
            const Icon = config.icon;
            return (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`w-full text-left bg-white rounded-xl shadow-sm p-4 flex items-start space-x-4 relative transition-all hover:shadow-md hover:ring-2 hover:ring-green-200 ${notification.isRead ? 'opacity-70' : ''}`}
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
          <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200">
            <p className="text-gray-500">No new notifications.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default AlertsScreen;
