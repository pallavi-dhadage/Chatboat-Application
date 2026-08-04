/**
 * useSocket — connects to Flask-SocketIO backend on port 5001
 */
import { useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5001";
let _socket = null;

export function getSocket() {
  if (!_socket || _socket.disconnected) {
    const token = localStorage.getItem("access_token");
    _socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });
    _socket.on("connect", () => console.log("[Socket] Connected:", _socket.id));
    _socket.on("disconnect", () => console.log("[Socket] Disconnected"));
    _socket.on("connect_error", (e) => console.error("[Socket] Error:", e.message));
  }
  return _socket;
}

export function disconnectSocket() {
  if (_socket) { _socket.disconnect(); _socket = null; }
}

export function useSocket() {
  const ref = useRef(null);
  useEffect(() => { ref.current = getSocket(); }, []);
  const emit = useCallback((event, data) => (ref.current || getSocket()).emit(event, data), []);
  const on   = useCallback((event, fn)   => (ref.current || getSocket()).on(event, fn),   []);
  const off  = useCallback((event, fn)   => (ref.current || getSocket()).off(event, fn),  []);
  return { socket: ref.current, emit, on, off };
}
