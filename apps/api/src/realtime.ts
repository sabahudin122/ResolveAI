import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { env } from './config/env.js';

export function createRealtimeServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN,
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    const organizationId = socket.handshake.auth.organizationId as string | undefined;
    const userId = socket.handshake.auth.userId as string | undefined;

    if (organizationId) {
      void socket.join(`org:${organizationId}`);
    }
    if (userId) {
      void socket.join(`user:${userId}`);
    }
  });

  return io;
}
