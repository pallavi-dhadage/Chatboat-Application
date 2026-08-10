/**
 * useSocket — connects to Flask-SocketIO backend.
 * Manages a singleton Socket.IO connection across the application.
 */
import { useEffect, useRef, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';
let _socket: Socket | null = null;

export function getSocket(): Socket {
  if (!_socket || _socket.disconnected) {
    const token = localStorage.getItem('cf_access_token');
    _socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });
    _socket.on('connect', () => {
      if (import.meta.env.DEV) console.log('[Socket] Connected:', _socket?.id);
    });
    _socket.on('disconnect', () => {
      if (import.meta.env.DEV) console.log('[Socket] Disconnected');
    });
    _socket.on('connect_error', (e: Error) => {
      console.error('[Socket] Error:', e.message);
    });
  }
  return _socket;
}

export function disconnectSocket(): void {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => void;

export function useSocket() {
  const ref = useRef<Socket | null>(null);

  useEffect(() => {
    ref.current = getSocket();
  }, []);

  const emit = useCallback((event: string, data?: unknown) => {
    (ref.current ?? getSocket()).emit(event, data);
  }, []);

  const on = useCallback((event: string, fn: AnyFn) => {
    (ref.current ?? getSocket()).on(event, fn);
  }, []);

  const off = useCallback((event: string, fn: AnyFn) => {
    (ref.current ?? getSocket()).off(event, fn);
  }, []);

  // Return a stable object; socket ref is only for internal use by emit/on/off
  return { emit, on, off };
}
