import { io, Socket } from 'socket.io-client';
import { SOCKET_URL, API_BASE_URL } from './config';
import { toast } from 'react-hot-toast';

// The backend URL - adjust if different from API base

/** 'unavailable' = this deployment has no realtime server at all (serverless
 *  hosting). Not an error and not something a reconnect can fix, so the UI
 *  must not show "reconnecting" — the app refreshes by polling instead. */
export type RealtimeStatus = 'connected' | 'connecting' | 'disconnected' | 'unavailable';

// Capability probe, cached for the session. The Vercel deployment answers
// /socket.io/ with the SPA's index.html, so socket.io-client fails, retries
// ten times and every user saw a permanent "Live updates unavailable —
// reconnecting…" banner. Ask the API once instead of guessing from failures.
let realtimeSupported: boolean | null = null;
let probe: Promise<boolean> | null = null;
export function isRealtimeSupported(): Promise<boolean> {
    if (realtimeSupported !== null) return Promise.resolve(realtimeSupported);
    if (!probe) {
        probe = fetch(`${API_BASE_URL}/health`, { cache: 'no-store' })
            .then((r) => r.json())
            .then((j) => (realtimeSupported = j?.realtime !== false))
            .catch(() => (realtimeSupported = true)) // unknown → let the socket try, as before
            .finally(() => { probe = null; });
    }
    return probe;
}

class SocketService {
    private socket: Socket | null = null;
    private schoolId: string | null = null;
    private status: RealtimeStatus = 'connecting';
    private statusListeners = new Set<(status: RealtimeStatus) => void>();
    // "Reconnecting…" is only true if there was a live connection to get back.
    // A socket that never connected (serverless host, health probe that failed
    // during a cold start, blocked websocket) has nothing to reconnect to — the
    // app polls instead, and users must not see a permanent orange banner.
    private everConnected = false;
    private lostConnection(): RealtimeStatus { return this.everConnected ? 'disconnected' : 'unavailable'; }

    private setStatus(status: RealtimeStatus) {
        if (this.status === status) return;
        this.status = status;
        this.statusListeners.forEach(fn => fn(status));
    }

    getStatus(): RealtimeStatus {
        return this.status;
    }

    /** Subscribe to connection status changes. Returns an unsubscribe function. */
    onStatusChange(fn: (status: RealtimeStatus) => void): () => void {
        this.statusListeners.add(fn);
        return () => this.statusListeners.delete(fn);
    }

    initialize(schoolId: string) {
        if (this.socket?.connected && this.schoolId === schoolId) return;
        this.schoolId = schoolId;
        isRealtimeSupported().then((supported) => {
            if (this.schoolId !== schoolId) return; // re-initialised meanwhile
            if (!supported) {
                if (this.socket) { this.socket.disconnect(); this.socket = null; }
                this.setStatus('unavailable');
                return;
            }
            this.connect(schoolId);
        });
    }

    private connect(schoolId: string) {
        if (this.socket) {
            this.socket.disconnect();
        }

        this.schoolId = schoolId;
        console.log(`🔌 [SocketService] Connecting to ${SOCKET_URL} for School: ${schoolId}`);

        // Same per-tab token AuthContext uses for every REST call (see
        // context/AuthContext.tsx). The server verifies it in its io.use()
        // handshake middleware and derives the socket's own school/user id
        // from it — join-school/register-user no longer trust whatever id
        // this client happens to send.
        const authToken = sessionStorage.getItem('auth_token');

        this.setStatus('connecting');

        this.socket = io(SOCKET_URL, {
            auth: { token: authToken },
            // Every WebSocket upgrade attempt was failing in production with no
            // fallback, so real-time was 100% down there while working locally —
            // confirmed the server (socket.service.ts) already accepts
            // ['websocket', 'polling'] and today's deploy (deploy/nginx.conf)
            // proxies to a single backend instance, not the load-balanced
            // multi-node setup the websocket-only restriction was guarding
            // against. If this app is later scaled behind a real load balancer,
            // that balancer needs sticky sessions (IP hash / cookie affinity)
            // for polling to keep working — this comment is the reminder.
            transports: ['websocket', 'polling'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });

        this.socket.on('connect', () => {
            console.log('🔌 [SocketService] WebSocket Connected');
            this.everConnected = true;
            this.setStatus('connected');
            this.socket?.emit('join-school');
            this.socket?.emit('register-user');
        });

        // reconnect_attempt/reconnect_failed are emitted by the Manager
        // (socket.io), not the Socket itself — attaching them to `this.socket`
        // directly is a silent no-op that never fires.
        this.socket.io.on('reconnect_attempt', () => {
            this.setStatus('connecting');
        });

        this.socket.io.on('reconnect_failed', () => {
            console.warn('🔌 [SocketService] Reconnection attempts exhausted — giving up until next initialize().');
            this.setStatus(this.lostConnection());
        });

        this.socket.on('connect_error', (err) => {
            console.warn('🔌 [SocketService] Connect error:', err.message);
            this.setStatus(this.lostConnection());
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
            
            // Class/subject ASSIGNMENT changes must also reach the screens that watch
            // the assignment-specific tables. useTeacherClasses (which feeds every
            // "Class & Subject" picker in the teacher dashboard — Create Assignment,
            // Gradebook, Attendance, Virtual Class...) listens for these table names,
            // not the generic 'teachers' one dispatched above. Without this bridge an
            // admin adding or removing a Subject Teacher in the Teacher Assignments
            // screen only showed up on the teacher's side after a manual page reload.
            // These are the exact action strings emitted by
            // backend/src/services/teacherAssignment.service.ts — verified, not guessed.
            const ASSIGNMENT_ACTIONS = [
                'class_teacher_assigned',
                'subject_teacher_assigned',
                'assignment_ended',
            ];
            if (ASSIGNMENT_ACTIONS.includes(data.action)) {
                ['class_teachers', 'teacher_classes', 'teacher_subjects'].forEach(table => {
                    window.dispatchEvent(new CustomEvent('realtime-update', {
                        detail: { table, record: data, action: data.action }
                    }));
                });
            }

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

        // A teacher deleted a session — remove it from student dashboards immediately.
        this.socket.on('virtual-class:deleted', (data) => {
            console.log('📹 [SocketService] Session deleted:', data);
            window.dispatchEvent(new CustomEvent('realtime-update', {
                detail: { table: 'virtual_classes', record: data, action: 'deleted' }
            }));
            window.dispatchEvent(new CustomEvent('virtual-class:deleted', { detail: data }));
        });

        // A teacher saved attendance (any class, any date) — refresh every screen
        // watching the 'attendance' table: the teacher's own register, the parent
        // dashboard's daily report, and the admin attendance overview all rely on
        // this single event to update live instead of only on next page load.
        this.socket.on('attendance:updated', (data) => {
            console.log('📋 [SocketService] Attendance update received:', data);
            window.dispatchEvent(new CustomEvent('realtime-update', {
                detail: { table: 'attendance', record: data, action: 'updated' }
            }));
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

        // A student's own record changed — e.g. promoted to the next grade/class.
        // Without this, a student already viewing their profile (or the dashboard's
        // "student" state) keeps showing stale data until a full page reload,
        // breaking the app's "no reload needed" real-time promise.
        this.socket.on('student:updated', (data) => {
            console.log('🎓 [SocketService] Student update received:', data);
            window.dispatchEvent(new CustomEvent('realtime-update', {
                detail: { table: 'students', record: data, action: data?.action }
            }));
        });

        // Class rosters/assignments changed (e.g. promotion moves students between
        // classes) — refresh anything listing classes or class membership.
        this.socket.on('class:updated', (data) => {
            window.dispatchEvent(new CustomEvent('realtime-update', {
                detail: { table: 'classes', record: data, action: data?.action }
            }));
        });

        // Broader academic-session events (promotion, term rollover, etc.).
        this.socket.on('academic:updated', (data) => {
            window.dispatchEvent(new CustomEvent('realtime-update', {
                detail: { table: 'academic', record: data, action: data?.action }
            }));
        });

        this.socket.on('disconnect', () => {
            console.log('🔌 [SocketService] WebSocket Disconnected');
            // socket.io-client keeps retrying on its own after this (reconnection
            // is enabled above), so this is "connecting" rather than a terminal
            // "disconnected" — reconnect_failed is the actual give-up signal.
            this.setStatus('connecting');
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
        // Deliberate (Low Data Mode, logout): nothing is trying to reconnect,
        // so this is "no live channel", not a connection problem to report.
        this.setStatus('unavailable');
    }

    /** Ensure a connection exists (used by features like Class Battle). */
    ensure(schoolId?: string): Socket {
        if (!this.socket) this.initialize(schoolId || this.schoolId || 'anon');
        return this.socket!;
    }

    getSocket(): Socket | null {
        return this.socket;
    }

    /** Emit an event, optionally with an ack callback (for request/response flows). */
    emit(event: string, data?: any, ack?: (response: any) => void): void {
        const s = this.ensure();
        if (ack) s.emit(event, data, ack);
        else s.emit(event, data);
    }

    on(event: string, handler: (...args: any[]) => void): void {
        this.ensure().on(event, handler);
    }

    off(event: string, handler?: (...args: any[]) => void): void {
        this.socket?.off(event, handler);
    }
}

export const socketService = new SocketService();
export default socketService;
