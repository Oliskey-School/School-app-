import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { registerClassBattle } from './classBattleSocket';
import { redisConnection } from '../config/redis';
import { config, DEMO_SCHOOL_ID } from '../config/env';
import prisma from '../config/database';

interface SocketUser {
  id: string;
  schoolId: string;
  branchId: string | null;
  role: string;
  isDemo: boolean;
}

// Same reasoning as backend/src/app.ts's Express CORS block: in production,
// the browser always reaches Socket.io through nginx on the same origin as
// the page (deploy/nginx.conf proxies /socket.io/ same-domain), so no CORS
// headers are needed there — `origin: '*'` was needlessly permissive for a
// credentialed real-time connection. In development, the Vite dev server
// (localhost:3000) connects to the backend (localhost:5000) cross-origin, so
// that still needs the request origin reflected.
const IS_PROD = process.env.NODE_ENV === 'production';
const SOCKET_CORS_OPTIONS = (!IS_PROD || process.env.ENABLE_CORS === 'true')
  ? { origin: true, methods: ['GET', 'POST'], credentials: true }
  : undefined;

export class SocketService {
  private static io: SocketIOServer | null = null;

  static init(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: SOCKET_CORS_OPTIONS,
      transports: ['websocket', 'polling']
    });

    // Auth handshake: without this, any anonymous socket could previously
    // call join-school('<any-school-id>')/register-user('<any-user-id>') and
    // receive that school's or that user's real-time events — announcements,
    // notifications, private messages — with no login at all. The REST API
    // has always verified the JWT on every call (auth.middleware.ts); sockets
    // now do the equivalent once, at connect time, and every room a socket is
    // allowed to join is derived server-side from that verified identity, not
    // from whatever id the client happens to send.
    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth?.token as string | undefined;
        if (!token) return next(new Error('Authentication required'));

        const decoded: any = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
        if (!decoded?.id) return next(new Error('Invalid token'));

        if (decoded.is_demo === true) {
          socket.data.user = {
            id: decoded.id,
            schoolId: DEMO_SCHOOL_ID,
            branchId: decoded.branch_id || null,
            role: decoded.role,
            isDemo: true,
          };
          return next();
        }

        socket.data.user = {
          id: decoded.id,
          schoolId: decoded.school_id,
          branchId: decoded.branch_id || null,
          role: decoded.role,
          isDemo: false,
        };
        next();
      } catch (err: any) {
        console.warn(`⚠️ [Socket] Auth handshake failed for ${socket.id}: ${err.message}`);
        next(new Error('Authentication failed'));
      }
    });

    // Low-level transport/handshake errors (before a socket even reaches
    // the 'connection' event) — e.g. malformed requests, origin rejections.
    this.io.engine.on('connection_error', (err: any) => {
      console.error(`🔥 [Socket] Engine connection error: ${err.code} ${err.message}`);
    });

    // Opt-in Redis pub/sub adapter: on a single instance (today's Contabo VPS
    // deployment) this changes nothing — Socket.io's default in-memory adapter
    // already handles everything. It matters the moment the app runs on more
    // than one Node process/instance: without it, `io.to(room).emit(...)` only
    // reaches sockets connected to THAT process, silently dropping real-time
    // events for users connected to a different instance. Flip
    // SOCKET_REDIS_ADAPTER=true (with REDIS_URL set) when horizontally scaling.
    if (process.env.SOCKET_REDIS_ADAPTER === 'true') {
      try {
        const { createAdapter } = require('@socket.io/redis-adapter');
        const pubClient = redisConnection.duplicate();
        const subClient = redisConnection.duplicate();
        this.io.adapter(createAdapter(pubClient, subClient));
        console.log('✅ [Socket.io] Redis pub/sub adapter enabled — safe for multi-instance scaling.');
      } catch (err: any) {
        console.warn('⚠️ [Socket.io] Redis adapter failed to initialize, falling back to in-memory adapter:', err.message);
      }
    }

    this.io.on('connection', (socket: Socket) => {
      const authedUser = socket.data.user!; // guaranteed by the io.use() auth middleware above
      console.log(`🔌 Socket connected: ${socket.id} (user: ${authedUser.id})`);

      // The school id comes from the socket's OWN verified identity, never
      // from the client argument — otherwise any connected socket could join
      // another school's room just by passing its id.
      socket.on('join-school', () => {
        socket.join(`school:${authedUser.schoolId}`);
        console.log(`🏫 Socket ${socket.id} joined school: ${authedUser.schoolId}`);
      });

      // Chat room management — client emits this when opening a conversation.
      // Verify actual membership (ChatParticipant) before letting the socket
      // listen in — a room id alone used to be enough to eavesdrop on any
      // conversation in any school.
      socket.on('join-chat-room', async (roomId: string) => {
        try {
          const participant = await prisma.chatParticipant.findFirst({
            where: { room_id: roomId, user_id: authedUser.id },
            select: { id: true },
          });
          if (!participant) {
            console.warn(`🚨 [Socket] User ${authedUser.id} tried to join chat room ${roomId} without membership`);
            return;
          }
          socket.join(`chat:room:${roomId}`);
          console.log(`💬 Socket ${socket.id} joined chat room: ${roomId}`);
        } catch (err: any) {
          console.error('[Socket] join-chat-room membership check failed:', err.message);
        }
      });

      socket.on('leave-chat-room', (roomId: string) => {
        socket.leave(`chat:room:${roomId}`);
      });

      // Typing indicators — userId is always the authenticated socket's own
      // id, never a client-supplied value, so a socket can't spoof someone
      // else's typing indicator in a room it's joined.
      socket.on('typing', ({ roomId, isTyping }: { roomId: string; isTyping: boolean }) => {
        socket.to(`chat:room:${roomId}`).emit('user:typing', { userId: authedUser.id, isTyping });
      });

      // User identity binding — lets backend target a specific user's socket.
      // Always the socket's own verified id, never a client-supplied one.
      socket.on('register-user', () => {
        socket.join(`user:${authedUser.id}`);
        console.log(`👤 Socket ${socket.id} registered as user: ${authedUser.id}`);
      });

      registerClassBattle(this.io!, socket);

      socket.on('error', (err: any) => {
        console.error(`🔥 [Socket] Error on ${socket.id} (user: ${authedUser.id}):`, err);
      });

      socket.on('disconnect', () => {
        console.log(`🔌 Socket disconnected: ${socket.id}`);
      });
    });

    return this.io;
  }

  /** Broadcast to everyone in a school */
  static emitToSchool(schoolId: string, event: string, data: any) {
    if (this.io) {
      this.io.to(`school:${schoolId}`).emit(event, data);
    }
  }

  /** Broadcast to everyone currently in a chat room */
  static emitToRoom(roomId: string, event: string, data: any) {
    if (this.io) {
      this.io.to(`chat:room:${roomId}`).emit(event, data);
    }
  }

  /** Send to a specific user (they must have emitted 'register-user') */
  static emitToUser(userId: string, event: string, data: any) {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data);
    }
  }

  /** Global broadcast — avoid for chat, use emitToRoom instead */
  static emit(event: string, data: any) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  static getIO() {
    return this.io;
  }
}
