import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    const newSocket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    newSocket.on('connect', () => {
      setConnected(true);
      console.log('Socket connected');
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
      console.log('Socket disconnected');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  return { socket, connected };
}

export function useMonitorSocket(monitorId: string, onCheckCompleted?: (data: any) => void) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !monitorId) return;

    socket.emit('subscribe:monitor', monitorId);

    if (onCheckCompleted) {
      socket.on('check:completed', onCheckCompleted);
    }

    return () => {
      socket.emit('unsubscribe:monitor', monitorId);
      if (onCheckCompleted) {
        socket.off('check:completed', onCheckCompleted);
      }
    };
  }, [socket, monitorId, onCheckCompleted]);

  return socket;
}
