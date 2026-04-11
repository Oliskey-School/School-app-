import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

export class SocketService {
  private static io: SocketIOServer | null = null;

  static init(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: '*', // Adjust for production
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling']
    });

    this.io.on('connection', (socket) => {
      console.log(`🔌 Socket connected: ${socket.id}`);

      socket.on('join-school', (schoolId: string) => {
        socket.join(`school:${schoolId}`);
        console.log(`🏫 Socket ${socket.id} joined school: ${schoolId}`);
      });

      socket.on('disconnect', () => {
        console.log(`🔌 Socket disconnected: ${socket.id}`);
      });
    });

    return this.io;
  }

  static emitToSchool(schoolId: string, event: string, data: any) {
    if (this.io) {
      this.io.to(`school:${schoolId}`).emit(event, data);
    }
  }

  static emit(event: string, data: any) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  static getIO() {
    return this.io;
  }
}
