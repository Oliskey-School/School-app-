import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({ socket: null });

export const useSocket = () => useContext(SocketContext);

import { SOCKET_URL } from '../lib/config';

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Connect to the backend
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Connected to real-time server');
      if (user?.school_id) {
        socket.emit('join-school', user.school_id);
      }
      // Register user identity so backend can target this socket for personal notifications
      if (user?.id) {
        socket.emit('register-user', user.id);
      }
    });

    // Helper to dispatch custom events for legacy useAutoSync hook
    const dispatchLegacyUpdate = (entity: string) => {
        window.dispatchEvent(new CustomEvent('realtime-update', { 
            detail: { table: entity } 
        }));
    };

    // Handle generic data invalidation
    socket.on('data-updated', (data: { entity: string, id?: string }) => {
      console.log(`🔄 Data updated: ${data.entity}`, data.id || '');
      // Invalidate relevant queries in React Query
      queryClient.invalidateQueries({ queryKey: [data.entity] });
      // Dispatch legacy event
      dispatchLegacyUpdate(data.entity);
    });

    // Chat message — real-time message pushed to the room
    socket.on('chat:message', (data: any) => {
        queryClient.invalidateQueries({ queryKey: ['chat', data.room_id] });
        queryClient.invalidateQueries({ queryKey: ['chat-rooms'] });
        queryClient.invalidateQueries({ queryKey: ['unread-count'] });
        dispatchLegacyUpdate('messages');
        dispatchLegacyUpdate('chat_rooms');
    });

    // User-specific personal channel events
    socket.on('user:chat_update', (data: any) => {
        queryClient.invalidateQueries({ queryKey: ['chat-rooms'] });
        queryClient.invalidateQueries({ queryKey: ['unread-count'] });
        dispatchLegacyUpdate('chat_rooms');
        dispatchLegacyUpdate('messages');
    });

    if (user?.id) {
        // Legacy per-user event name (kept for backward compat)
        socket.on(`user:${user.id}:chat_update`, () => {
            queryClient.invalidateQueries({ queryKey: ['chat-rooms'] });
            queryClient.invalidateQueries({ queryKey: ['unread-count'] });
            dispatchLegacyUpdate('chat_rooms');
        });

        socket.on(`user:${user.id}:notification`, (notification: any) => {
            console.log('🔔 New notification received:', notification.title);
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            dispatchLegacyUpdate('notifications');
        });
    }

    socket.on('fee:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['fees'] });
        queryClient.invalidateQueries({ queryKey: ['analytics'] });
        dispatchLegacyUpdate('fees');
        dispatchLegacyUpdate('analytics');
    });

    socket.on('student:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['students'] });
        queryClient.invalidateQueries({ queryKey: ['analytics'] });
        dispatchLegacyUpdate('students');
        dispatchLegacyUpdate('analytics');
    });

    socket.on('attendance:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['attendance'] });
        queryClient.invalidateQueries({ queryKey: ['analytics'] });
        dispatchLegacyUpdate('attendance');
        dispatchLegacyUpdate('analytics');
    });

    socket.on('class:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['classes'] });
        dispatchLegacyUpdate('classes');
    });

    socket.on('parent:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['parents'] });
        queryClient.invalidateQueries({ queryKey: ['students'] });
        queryClient.invalidateQueries({ queryKey: ['parent_student_links'] });
        dispatchLegacyUpdate('parents');
        dispatchLegacyUpdate('students');
        dispatchLegacyUpdate('parent_student_links');
    });

    socket.on('teacher:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['teachers'] });
        queryClient.invalidateQueries({ queryKey: ['analytics'] });
        queryClient.invalidateQueries({ queryKey: ['timetables'] });
        dispatchLegacyUpdate('teachers');
        dispatchLegacyUpdate('analytics');
        // Class/subject assignment changes live here — trigger useTeacherClasses
        // re-fetch so the teacher's dashboard, class cards, and timetable update
        // the moment an admin saves new assignments.
        dispatchLegacyUpdate('class_teachers');
        dispatchLegacyUpdate('teacher_classes');
        dispatchLegacyUpdate('teacher_subjects');
        // Also refresh timetable views — the server-side filter uses ClassTeacher
        // records, so new assignments must cause TimetableScreen to re-query.
        dispatchLegacyUpdate('timetables');
        dispatchLegacyUpdate('timetable');
    });

    // Timetable publish/update — refetch for all roles in the school
    socket.on('timetable:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['timetables'] });
        dispatchLegacyUpdate('timetables');
        dispatchLegacyUpdate('timetable');
    });

    socket.on('timetable:published', (data: { class_name?: string; school_id?: string }) => {
        queryClient.invalidateQueries({ queryKey: ['timetables'] });
        dispatchLegacyUpdate('timetables');
        dispatchLegacyUpdate('timetable');
    });

    socket.on('academic:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['academic'] });
        queryClient.invalidateQueries({ queryKey: ['analytics'] });
        queryClient.invalidateQueries({ queryKey: ['quizzes'] });
        dispatchLegacyUpdate('academic');
        dispatchLegacyUpdate('analytics');
        // Quiz publish/unpublish rides on academic:updated — refresh quiz lists
        // so students see a newly published exam/quiz appear (or disappear) live.
        dispatchLegacyUpdate('quizzes');
    });

    socket.on('exam:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['exams'] });
        dispatchLegacyUpdate('exams');
    });

    // School subject added/removed — every subject list (timetable palette,
    // class form, gradebook, student My Subjects) refreshes live.
    socket.on('subject:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['subjects'] });
        dispatchLegacyUpdate('subjects');
    });

    // Report card saved/submitted/published — refresh the teacher gradebook,
    // the admin publishing screen, and student/parent results views live.
    socket.on('report-card:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['report_cards'] });
        queryClient.invalidateQueries({ queryKey: ['reportCards'] });
        dispatchLegacyUpdate('report_cards');
        dispatchLegacyUpdate('report_card_records');
    });

    socket.on('hostel:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['hostels'] });
        dispatchLegacyUpdate('hostels');
    });

    socket.on('transport:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['transport'] });
        dispatchLegacyUpdate('transport');
    });

    socket.on('payroll:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['payroll'] });
        dispatchLegacyUpdate('payroll');
    });

    socket.on('leave:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['leave'] });
        dispatchLegacyUpdate('leave');
    });

    socket.on('infrastructure:updated', (data: { action?: string }) => {
        queryClient.invalidateQueries({ queryKey: ['infrastructure'] });
        dispatchLegacyUpdate('infrastructure');
        // Vendor CRUD rides on this same event (see backend/src/services/vendor.service.ts).
        // Without this, VendorManagement's useAutoSync(['vendors']) never fires across
        // tabs/roles because no event is ever dispatched with table: 'vendors'.
        if (data?.action?.includes('vendor')) {
            queryClient.invalidateQueries({ queryKey: ['vendors'] });
            dispatchLegacyUpdate('vendors');
        }
    });

    socket.on('visitor:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['visitor'] });
        dispatchLegacyUpdate('visitor');
    });

    socket.on('quiz:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['quizzes'] });
        queryClient.invalidateQueries({ queryKey: ['academic'] });
        dispatchLegacyUpdate('quizzes');
    });

    socket.on('lesson:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['lessons'] });
        queryClient.invalidateQueries({ queryKey: ['academic'] });
        dispatchLegacyUpdate('lessons');
    });

    socket.on('finance:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['finance'] });
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['savings'] });
        queryClient.invalidateQueries({ queryKey: ['analytics'] });
        dispatchLegacyUpdate('finance');
        dispatchLegacyUpdate('analytics');
    });

    socket.on('ai:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['ai'] });
        dispatchLegacyUpdate('ai');
    });

    socket.on('notice:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['notices'] });
        queryClient.invalidateQueries({ queryKey: ['reports'] });
        dispatchLegacyUpdate('notices');
    });

    socket.on('audit:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['audit'] });
        dispatchLegacyUpdate('audit');
    });

    socket.on('auth:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['users'] });
        dispatchLegacyUpdate('auth');
    });

    socket.on('resource:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['resources'] });
        dispatchLegacyUpdate('resources');
    });

    socket.on('assignment:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['assignments'] });
        queryClient.invalidateQueries({ queryKey: ['academic'] });
        dispatchLegacyUpdate('assignments');
        dispatchLegacyUpdate('academic');
    });

    socket.on('submission:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['submissions'] });
        dispatchLegacyUpdate('submissions');
        dispatchLegacyUpdate('assignment_submissions');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.school_id, queryClient]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current }}>
      {children}
    </SocketContext.Provider>
  );
};
