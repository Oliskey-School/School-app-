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

    // Specific entity listeners
    socket.on('chat:message', (data: any) => {
        queryClient.invalidateQueries({ queryKey: ['chat', data.room_id] });
        queryClient.invalidateQueries({ queryKey: ['chat-rooms'] });
        dispatchLegacyUpdate('messages');
    });

    // Handle user-specific notifications and chat updates
    if (user?.id) {
        socket.on(`user:${user.id}:chat_update`, () => {
            queryClient.invalidateQueries({ queryKey: ['chat-rooms'] });
            dispatchLegacyUpdate('chat-rooms');
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
        dispatchLegacyUpdate('teachers');
        dispatchLegacyUpdate('analytics');
    });

    socket.on('academic:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['academic'] });
        queryClient.invalidateQueries({ queryKey: ['analytics'] });
        dispatchLegacyUpdate('academic');
        dispatchLegacyUpdate('analytics');
    });

    socket.on('exam:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['exams'] });
        dispatchLegacyUpdate('exams');
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

    socket.on('infrastructure:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['infrastructure'] });
        dispatchLegacyUpdate('infrastructure');
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
