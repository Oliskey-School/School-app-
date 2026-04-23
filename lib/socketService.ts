import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from './config';

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
