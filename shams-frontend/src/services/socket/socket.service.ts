/// <reference types="vite/client" />

import { io, Socket } from 'socket.io-client';
import { store } from '@store/index';
import { addNotification } from '@store/slices/notificationSlice';
import type { Notification } from '@types';

const getBaseUrl = (): string => {
  try {
    const fromEnv = import.meta.env?.VITE_API_URL as string | undefined;
    if (fromEnv) return fromEnv.replace('/api/v1', '');
  } catch {
    // ignore in non-Vite environments
  }
  return 'http://localhost:3000';
};

const SOCKET_URL = getBaseUrl();

class SocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    if (this.socket?.connected) return;

    this.socket = io(`${SOCKET_URL}/notifications`, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () => {
      console.log('🔌 Socket connected:', this.socket?.id);
    });

    this.socket.on('notification', (data: Notification) => {
      store.dispatch(addNotification(data));
    });

    this.socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();
