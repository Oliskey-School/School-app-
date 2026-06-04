import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from './config';
import { toast } from 'react-hot-toast';

// The backend URL - adjust if different from API base

class SocketService {
    private socket: Socket | null = null;
    private schoolId: string | null = null;

    initialize(schoolId: string) {
        if (this.socket?.connected && this.schoolId === schoolId) return;
        
        if (this.socket) {
            this.socket.disconnect();
        }

        this.schoolId = schoolId;
        console.log(`🔌 [SocketService] Connecting to ${SOCKET_URL} for School: ${schoolId}`);

        this.socket = io(SOCKET_URL, {
            transports: ['websocket'], // Force websocket to avoid HTTP polling drops on stateless Railway load balancer 
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000
        });

        this.socket.on('connect', () => {
            console.log('🔌 [SocketService] WebSocket Connected');
            if (this.schoolId) {
                this.socket?.emit('join-school', this.schoolId);
            }
        });

        this.socket.on('teacher:updated', (data) => {
            console.log('📡 [SocketService] Teacher update received:', data);
            // Dispatch global DOM event for useAutoSync and useRealtimeListener
            window.dispatchEvent(new CustomEvent('realtime-update', {
                detail: {
                    table: 'teachers', // Or 'staff_attendance' depending on context
                    record: data,
                    action: data.action
                }
            }));
            
            // Also dispatch for staff_attendance specifically if it's an attendance action
            if (data.action === 'attendance_submit') {
                window.dispatchEvent(new CustomEvent('realtime-update', {
                    detail: {
                        table: 'staff_attendance',
                        record: data
                    }
                }));
            }
        });

        // A teacher started a live virtual classroom — let students know immediately
        // so they can join (toast prompt + DOM events for any subscribed view).
        this.socket.on('virtual-class:started', (data) => {
            console.log('📹 [SocketService] Live class started:', data);
            try {
                const role = (sessionStorage.getItem('active_dashboard_role') || '').toLowerCase();
                // Only students get the "join" toast. Parents are alerted via the bell
                // (notification:received) since they cannot join the room.
                if (role === 'student') {
                    toast.success(`📹 Live class started: ${data?.title || 'Virtual Classroom'} — open Virtual Classroom to join`, {
                        duration: 8000,
                        id: `live-${data?.sessionId || 'class'}`,
                    });
                }
            } catch { /* sessionStorage may be unavailable */ }
            // Refresh any component listening for virtual class updates (student dashboard
            // join button, virtual class lists, etc.).
            window.dispatchEvent(new CustomEvent('realtime-update', {
                detail: { table: 'virtual_classes', record: data, action: 'started' }
            }));
            window.dispatchEvent(new CustomEvent('virtual-class:started', { detail: data }));
        });

        // A teacher ended a live class — remove the students' "Join Live Class" button.
        this.socket.on('virtual-class:ended', (data) => {
            console.log('📹 [SocketService] Live class ended:', data);
            window.dispatchEvent(new CustomEvent('realtime-update', {
                detail: { table: 'virtual_classes', record: data, action: 'ended' }
            }));
            window.dispatchEvent(new CustomEvent('virtual-class:ended', { detail: data }));
        });

        // Global Teacher Community changed anywhere on the platform — refresh lists.
        this.socket.on('global-forum:updated', (data) => {
            window.dispatchEvent(new CustomEvent('realtime-update', {
                detail: { table: 'global_forum', record: data, action: data?.action }
            }));
        });

        // A new notification (incl. live-class alerts) arrived — refresh the bell.
        this.socket.on('notification:received', (data) => {
            window.dispatchEvent(new CustomEvent('realtime-update', {
                detail: { table: 'notifications', record: data, action: 'received' }
            }));
        });

        this.socket.on('disconnect', () => {
            console.log('🔌 [SocketService] WebSocket Disconnected');
        });

        this.socket.on('error', (err) => {
            console.error('🔌 [SocketService] Connection error:', err);
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}

export const socketService = new SocketService();
export default socketService;
