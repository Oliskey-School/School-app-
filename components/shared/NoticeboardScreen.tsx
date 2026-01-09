
import React, { useMemo, useState, useEffect } from 'react';
import { PinIcon } from '../../constants';
import { supabase } from '../../lib/supabase';
import { Notice, AnnouncementCategory } from '../../types';

interface NoticeboardScreenProps {
  userType: 'parent' | 'student' | 'teacher' | 'admin';
}

const categoryStyles: { [key in AnnouncementCategory]: { bg: string, text: string, border: string } } = {
  Urgent: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200' },
  Event: { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-200' },
  Holiday: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200' },
  General: { bg: 'bg-gray-50', text: 'text-gray-800', border: 'border-gray-200' },
  'Homework': { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
  'Test Reminder': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
};

const NoticeCard: React.FC<{ notice: Notice }> = ({ notice }) => {
  const styles = categoryStyles[notice.category] || categoryStyles['General'];

  return (
    <div className={`rounded-xl shadow-sm border ${styles.border} overflow-hidden`}>
      <div className={`${styles.bg} p-4`}>
        {notice.videoUrl ? (
          <video src={notice.videoUrl} controls className="w-full h-40 object-cover rounded-lg mb-3 bg-black"></video>
        ) : notice.imageUrl && (
          <img src={notice.imageUrl} alt={notice.title} className="w-full h-32 object-cover rounded-lg mb-3" />
        )}
        <div className="flex justify-between items-start">
          <h3 className={`font-bold text-lg ${styles.text}`}>{notice.title}</h3>
          {notice.isPinned && (
            <div className="flex-shrink-0 ml-2">
              <PinIcon className={`w-5 h-5 -rotate-45 ${styles.text}`} />
            </div>
          )}
        </div>
        <p className="text-sm text-gray-700 mt-1">
          {new Date(notice.timestamp).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>
      <div className="p-4 bg-white">
        <p className="text-gray-800">{notice.content}</p>
        {notice.videoUrl && !notice.content && (
          <p className="text-gray-800">Please watch the video announcement above.</p>
        )}
      </div>
    </div>
  );
};


const NoticeboardScreen: React.FC<NoticeboardScreenProps> = ({ userType }) => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotices();

    // Realtime subscription
    const subscription = supabase
      .channel('public:notices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, () => {
        console.log('Notice change detected');
        loadNotices();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const loadNotices = async () => {
    setLoading(true);
    const data = await fetchNotices();
    // fetchNotices already returns Notice[], so no mapping needed if types align
    // But fetchNotices in DB returns basic shape, might need to ensure mapped correctly?
    // Let's check fetchNotices implementation again.
    // It returns mapped properties: title, content, etc.
    // So we can just set it.
    if (data) {
      setNotices(data);
    }
    setLoading(false);
  };

  const relevantNotices = useMemo(() => {
    return notices
      .filter(notice =>
        notice.audience.includes('all') ||
        notice.audience.includes(`${userType}s` as 'parents' | 'students' | 'teachers')
      )
      .sort((a, b) => {
        // Pinned items first, then by date
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
  }, [userType, notices]);

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div></div>;
  }

  return (
    <div className="flex flex-col h-full bg-gray-100">
      <main className="flex-grow p-4 space-y-4 overflow-y-auto">
        {relevantNotices.length > 0 ? (
          relevantNotices.map(notice => (
            <NoticeCard key={notice.id} notice={notice} />
          ))
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-700">No announcements found.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default NoticeboardScreen;
