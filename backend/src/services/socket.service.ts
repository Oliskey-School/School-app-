import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { registerClassBattle } from './classBattleSocket';
import { redisConnection } from '../config/redis';

export class SocketService {
  private static io: SocketIOServer | null = null;

  static init(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling']
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
      console.log(`🔌 Socket connected: ${socket.id}`);

      socket.on('join-school', (schoolId: string) => {
        socket.join(`school:${schoolId}`);
        console.log(`🏫 Socket ${socket.id} joined school: ${schoolId}`);
      });

      // Chat room management — client emits this when opening a conversation
      socket.on('join-chat-room', (roomId: string) => {
        socket.join(`chat:room:${roomId}`);
        console.log(`💬 Socket ${socket.id} joined chat room: ${roomId}`);
      });

      socket.on('leave-chat-room', (roomId: string) => {
        socket.leave(`chat:room:${roomId}`);
      });

      // Typing indicators
      socket.on('typing', ({ roomId, userId, isTyping }: { roomId: string; userId: string; isTyping: boolean }) => {
        socket.to(`chat:room:${roomId}`).emit('user:typing', { userId, isTyping });
      });

      // User identity binding — lets backend target a specific user's socket
      socket.on('register-user', (userId: string) => {
        socket.join(`user:${userId}`);
        console.log(`👤 Socket ${socket.id} registered as user: ${userId}`);
      });

      registerClassBattle(this.io!, socket);

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
