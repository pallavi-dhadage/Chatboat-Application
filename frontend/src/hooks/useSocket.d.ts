/**
 * Type declarations for useSocket.js
 */
import type { Socket } from 'socket.io-client';

/** Returns the singleton Socket.IO instance, creating it if needed. */
export declare function getSocket(): Socket;

/** Disconnects and disposes the singleton socket. */
export declare function disconnectSocket(): void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => void;

export interface UseSocketReturn {
  /** Emit an event to the server */
  emit: (event: string, data?: unknown) => void;
  /** Subscribe to a server event */
  on: (event: string, fn: AnyFn) => void;
  /** Unsubscribe from a server event */
  off: (event: string, fn: AnyFn) => void;
}

/** Hook providing typed access to the shared Socket.IO connection. */
export declare function useSocket(): UseSocketReturn;
