import React, { useMemo, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../context/ProfileContext';
// import { mockNotifications } from '../../data'; // Mock removed
import { mockStudents, mockFees } from '../../data'; // Keeping these for navigation mapping for now
import { NOTIFICATION_CATEGORY_CONFIG } from '../../constants';
// import { Notification } from '../../types';

// Defining local interface to match DB schema if needed, or use types
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
}

const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ userType, navigateTo, schoolId }) => {
  const { profile } = useProfile();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      if (!profile?.id) return; // Wait for profile

      // Fetch notifications where audience contains userType OR specific user_id match
      // Note: Logic for 'audience' array check in Supabase might need specific filter or RLS
      // For now, simpler query: fetch all for user_id match (if we have a user_notifications join) 
      // OR fallback to simple "audience includes userType" checks if stored as JSON/Array.

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      // Ideally, backend should handle "For Me" logic via RLS. 
      // We will fetch widely and filter locally if complex, or ideally rely on 'recipient_id' if it exists.
      // Assuming 'audience' is a text array or JSONB in DB.

      // For this implementation, we'll assume valid RLS or simple fetching.
      const { data, error } = await query;

      if (error) throw error;

      // Filter locally for now to match strict permissions if DB RLS isn't perfect
      const filtered = (data || []).filter((n: any) => {
        const aud = n.audience || []; // Assuming audience is array string in DB
        const isForRole = aud.includes('all') || aud.includes(userType);
        const isForUser = n.user_id === profile.id || !n.user_id; // Check user_id matches profile.id
        return isForRole && isForUser;
        return isForRole && isForUser;
      }).map((n: any) => ({
        id: n.id,
        title: n.title,
        summary: n.message, // Mapping 'message' col to 'summary' prop
        category: n.type,   // Mapping 'type' col to 'category' prop
        audience: n.audience,
        is_read: n.is_read || false,
        timestamp: n.created_at,
        student_id: n.student_id, // flexible mapping
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

    const channel = supabase.channel(`public:notifications:school:${schoolId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: schoolId ? `school_id=eq.${schoolId}` : undefined
      }, (payload) => {
        fetchNotifications();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); }
  }, [profile, userType]);


  const markAsRead = async (notificationId: string) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Parent-specific navigation logic
    if (userType === 'parent') {
      switch (notification.category) {
        case 'Fees':
          const feeStudentInfo = mockFees.find(f => f.id === notification.student_id);
          if (feeStudentInfo) {
            navigateTo('feeStatus', 'Fee Status', { student: feeStudentInfo });
          }
          // Fallback if no mock data match
          else navigateTo('feeStatus', 'Fee Status', {});
          break;
        case 'Attendance':
          const student = mockStudents.find(s => s.id === notification.student_id);
          if (student) {
            navigateTo('childDetail', student.name, { student, initialTab: 'attendance' });
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
    } else if (userType === 'admin') {
      // Admin navigation logic
      switch (notification.category) {
        case 'Fees': navigateTo('feeManagement', 'Fee Management', {}); break;
        case 'System': navigateTo('systemSettings', 'System Settings', {}); break;
        case 'Message': navigateTo('messages', 'Messages', {}); break;
        default: break;
      }
    } else if (userType === 'student') {
      // Student navigation logic
      switch (notification.category) {
        case 'Homework':
          // Check if we have an assignment ID linked
          if (notification.student_id) { // mapped from related_id/student_id
            // We need to fetch the assignment details or pass ID
            // Ideally navigate to assignment detail. 
            // For now, go to Assignments list or specific assignment if possible
            // Assuming 'link' might contain ID or related_id is assignment ID

            // In AssignmentSubmissionScreen, we stored 'related_id: assignment.id'
            // In NotificationsScreen, we mapped 'student_id: n.related_entity_id' (Wait, check map)
            // Let's check the map in fetchNotifications:
            // student_id: n.related_entity_id 
            // BUT in insert we used 'related_id'. 
            // We should fix the mapping first to be sure.
          }
          navigateTo('assignments', 'My Assignments', {});
          break;
        case 'Message': navigateTo('messages', 'My Messages', {}); break;
        case 'Grades': navigateTo('results', 'My Results', { studentId: profile.id }); break;
        default: break;
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-100">
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