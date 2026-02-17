import React, { useMemo, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../context/ProfileContext';
import { mockStudents, mockFees } from '../../data';
import { NOTIFICATION_CATEGORY_CONFIG } from '../../constants';

interface Notification {
  id: string;
  title: string;
  summary: string;
  category: 'System' | 'Message' | 'Alert' | 'Event' | 'Assignment' | 'Grades' | 'Attendance' | 'Fees' | 'Homework';
  audience: string[];
  is_read: boolean;
  timestamp: string;
  student_id?: string;
  related_id?: string;
  link?: string;
}

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

interface NotificationsScreenProps {
  userType: 'admin' | 'parent' | 'student' | 'teacher';
  navigateTo: (view: string, title: string, props?: any) => void;
  schoolId?: string;
  student?: any; // Added student prop
}

const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ userType, navigateTo, schoolId, student }) => {
  const { profile } = useProfile();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      // Use the derived schoolId (priority: prop > profile > demo)
      const activeSchoolId = schoolId || profile?.schoolId || (profile?.email?.includes('demo') ? 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' : undefined);

      if (!activeSchoolId) {
        console.warn('🔔 [NotificationsScreen] No schoolId available for fetch');
        return;
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('school_id', activeSchoolId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const roleToCheck = (userType || 'student').toLowerCase();
      const studentGrade = student?.grade || profile?.grade; // Fallback to profile if added there later

      const filtered = (data || []).filter((n: any) => {
        let audience: string[] = [];
        const audField = n.audience;
        if (Array.isArray(audField)) {
          audience = audField;
        } else if (typeof audField === 'string') {
          if (audField.startsWith('{') && audField.endsWith('}')) {
            audience = audField.slice(1, -1).split(',').map(s => s.trim());
          } else {
            audience = [audField];
          }
        }

        const isForRole = audience.some((s: any) => {
          const audStr = String(s || '').toLowerCase();
          // Match by general role (student/teacher/etc) OR by specific class (e.g. Grade 10)
          const isGeneralRole = audStr === roleToCheck || audStr === 'all';
          const isSpecificClass = userType === 'student' && studentGrade && audStr === `grade ${studentGrade}`;
          
          return isGeneralRole || isSpecificClass;
        });

        const isForUser = !n.user_id || (profile?.id && String(n.user_id) === String(profile.id));
        return isForRole && isForUser;
      }).map((n: any) => ({
        id: n.id,
        title: n.title,
        summary: n.message,
        category: n.category || 'System',
        audience: n.audience,
        is_read: n.is_read || false,
        timestamp: n.created_at,
        student_id: n.student_id,
        related_id: n.related_id,
        link: n.link
      }));

      setNotifications(filtered);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const activeSchoolId = schoolId || profile?.schoolId || 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';

    const channel = supabase.channel(`notifications-screen-${activeSchoolId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `school_id=eq.${activeSchoolId}`
      }, (payload) => {
        console.log('🔔 [NotificationsScreen] Update received:', payload);
        fetchNotifications();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); }
  }, [profile?.id, userType, schoolId, profile?.schoolId]);

  const markAsRead = async (notificationId: string) => {
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) await markAsRead(notification.id);

    if (userType === 'parent') {
      switch (notification.category) {
        case 'Fees':
          const feeStudentInfo = mockFees.find(f => f.id === notification.student_id);
          navigateTo('feeStatus', 'Fee Status', feeStudentInfo ? { student: feeStudentInfo } : {});
          break;
        case 'Attendance':
          const student = mockStudents.find(s => s.id === notification.student_id);
          if (student) navigateTo('childDetail', student.name, { student, initialTab: 'attendance' });
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
    } else if (userType === 'admin') {
      switch (notification.category) {
        case 'Fees': navigateTo('feeManagement', 'Fee Management', {}); break;
        case 'System': navigateTo('systemSettings', 'System Settings', {}); break;
        case 'Message': navigateTo('messages', 'Messages', {}); break;
        default: break;
      }
    } else if (userType === 'student') {
      switch (notification.category) {
        case 'Homework': navigateTo('assignments', 'My Assignments', {}); break;
        case 'Message': navigateTo('messages', 'My Messages', {}); break;
        case 'Grades': navigateTo('results', 'My Results', { studentId: profile.id }); break;
        default: break;
      }
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    try {
      const { error } = await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
      if (error) throw error;
      toast.success('All marked as read');
    } catch (err) {
      console.error('Error marking all as read:', err);
      toast.error('Failed to update');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-100">
      <div className="flex justify-between items-center p-4 pb-0">
        <h2 className="text-lg font-bold text-gray-800">Notifications</h2>
        {notifications.some(n => !n.is_read) && (
          <button onClick={markAllAsRead} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
            Mark all as read
          </button>
        )}
      </div>
      <main className="flex-grow p-4 space-y-3 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center pt-10"><div className="animate-spin h-8 w-8 border-4 border-indigo-500 rounded-full border-t-transparent"></div></div>
        ) : notifications.length > 0 ? (
          notifications.map(notification => {
            const config = NOTIFICATION_CATEGORY_CONFIG[notification.category] || NOTIFICATION_CATEGORY_CONFIG['System'];
            const Icon = config.icon;
            return (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`w-full text-left bg-white rounded-xl shadow-sm p-4 flex items-start space-x-4 relative transition-all hover:shadow-md hover:ring-2 hover:ring-gray-200 ${notification.is_read ? 'opacity-70' : ''}`}
              >
                {!notification.is_read && (
                  <div className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse"></div>
                )}
                <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${config.bg}`}>
                  <Icon className={`w-6 h-6 ${config.color}`} />
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-center">
                    <p className={`font-bold ${notification.is_read ? 'text-gray-700' : 'text-gray-900'}`}>{notification.title}</p>
                    <p className="text-xs text-gray-500 flex-shrink-0 ml-2">
                      {formatDistanceToNow(notification.timestamp)}
                    </p>
                  </div>
                  <p className={`text-sm mt-1 ${notification.is_read ? 'text-gray-600' : 'text-gray-800'}`}>{notification.summary}</p>
                </div>
              </button>
            )
          })
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-500">No new notifications.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default NotificationsScreen;